import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guard";
import { novyKlic, otiskKlice } from "@/lib/apiklice/hash";
import { otisk } from "@/lib/apiklice/klice";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Jak dlouho starý klíč po výměně ještě funguje. */
const DOBEH_HODIN = 24;

/**
 * Výměna klíče bez výpadku.
 *
 * Vznikne nový, starý ještě den funguje. Bez toho by výměna shodila
 * web do chvíle, než ho někdo přepíše na hostingu — a to může být
 * v noci nebo o víkendu.
 */
export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  let b: { id?: number };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "Chybí klíč." }, { status: 400 });

  const db = serviceClient();
  const { data: stary } = await db.from("api_klice")
    .select("nazev, druh, opravneni, domeny, ip_seznam, limit_hod, plati_do, jen_nanecisto, odvolany_at")
    .eq("id", id)
    .maybeSingle<{
      nazev: string; druh: string; opravneni: string[]; domeny: string[];
      ip_seznam: string[]; limit_hod: number; plati_do: string | null;
      jen_nanecisto: boolean; odvolany_at: string | null;
    }>();

  if (!stary) return NextResponse.json({ error: "Klíč nenalezen." }, { status: 404 });
  if (stary.odvolany_at) {
    return NextResponse.json({ error: "Odvolaný klíč nejde vyměnit." }, { status: 400 });
  }

  const klic = novyKlic(stary.druh === "test" ? "test" : "live");

  // Nový přebírá všechna nastavení — výměna nesmí nic tiše rozšířit.
  const { data: novy, error } = await db.from("api_klice").insert({
    nazev: stary.nazev,
    otisk_hash: otiskKlice(klic),
    nahled: otisk(klic),
    druh: stary.druh,
    opravneni: stary.opravneni,
    domeny: stary.domeny,
    ip_seznam: stary.ip_seznam,
    limit_hod: stary.limit_hod,
    plati_do: stary.plati_do,
    jen_nanecisto: stary.jen_nanecisto,
    vytvoril: me.id,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dobehne = new Date(Date.now() + DOBEH_HODIN * 3_600_000).toISOString();
  await db.from("api_klice")
    .update({ nahrazen_id: novy.id, dobehne_do: dobehne })
    .eq("id", id);

  await audit({
    action: "apiklic.rotated", entity: "api_klice", entityId: String(id),
    actorId: me.id, source: "manual",
    reason: `Vyměněn klíč ${stary.nazev}, starý doběhne ${new Date(dobehne).toLocaleString("cs-CZ")}`,
  });

  return NextResponse.json({ klic, id: novy.id, dobehne_do: dobehne }, { status: 201 });
}
