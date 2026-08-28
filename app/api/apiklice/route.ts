import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guard";
import { novyKlic, otiskKlice } from "@/lib/apiklice/hash";
import { platneOpravneni, otisk } from "@/lib/apiklice/klice";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Seznam klíčů. Klíč sám se nikdy nevrací — není kde ho vzít. */
export async function GET() {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  const db = serviceClient();
  const { data: klice } = await db.from("api_klice")
    .select("id, nazev, nahled, druh, opravneni, domeny, ip_seznam, limit_hod, plati_do, posledni_pouziti, odvolany_at, dobehne_do, created_at")
    .order("created_at", { ascending: false });

  const idcka = (klice ?? []).map((k) => k.id as number);
  const pred = new Date(Date.now() - 7 * 864e5).toISOString();

  const { data: volani } = idcka.length
    ? await db.from("api_volani").select("klic_id, stav, created_at")
        .in("klic_id", idcka).gte("created_at", pred).limit(5000)
    : { data: [] };

  return NextResponse.json({
    klice: (klice ?? []).map((k) => {
      const moje = (volani ?? []).filter((v) => v.klic_id === k.id);
      // Sedm dní po dnech, nejstarší vlevo.
      const dny = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.now() - (6 - i) * 864e5).toDateString();
        return moje.filter((v) => new Date(v.created_at as string).toDateString() === d).length;
      });
      return {
        ...k,
        dnes: dny[6],
        graf: dny,
        chyb: moje.filter((v) => Number(v.stav) >= 400).length,
      };
    }),
  });
}

/**
 * Nový klíč.
 *
 * Vrátí se právě jednou. Do databáze jde jen otisk, takže
 * ho podruhé nikdo nezobrazí — ani správce, ani útočník.
 */
export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const nazev = String(b.nazev ?? "").trim().slice(0, 80);
  const opravneni = Array.isArray(b.opravneni) ? (b.opravneni as string[]) : [];

  if (!nazev) return NextResponse.json({ error: "Chybí název." }, { status: 400 });
  if (!platneOpravneni(opravneni)) {
    return NextResponse.json({ error: "Vyber aspoň jedno platné oprávnění." }, { status: 400 });
  }

  const druh = b.druh === "test" ? "test" : "live";
  const klic = novyKlic(druh);

  const domeny = Array.isArray(b.domeny)
    ? (b.domeny as string[]).map((d) => d.trim()).filter(Boolean).slice(0, 10)
    : [];

  const db = serviceClient();
  const { data, error } = await db.from("api_klice").insert({
    nazev,
    otisk_hash: otiskKlice(klic),
    nahled: otisk(klic),
    druh,
    opravneni,
    domeny,
    ip_seznam: Array.isArray(b.ip_seznam)
      ? (b.ip_seznam as string[]).map((x) => x.trim()).filter(Boolean).slice(0, 20)
      : [],
    limit_hod: Math.min(Math.max(Number(b.limit_hod) || 600, 10), 10_000),
    // Testovací klíč volání zaznamená, ale nic neuloží.
    jen_nanecisto: druh === "test",
    plati_do: typeof b.plati_do === "string" && b.plati_do ? b.plati_do : null,
    vytvoril: me.id,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: "apiklic.created", entity: "api_klice", entityId: String(data.id),
    actorId: me.id, source: "manual",
    reason: `Vytvořen klíč ${nazev} (${opravneni.join(", ")})`,
  });

  // Jediné místo, kde klíč opustí server.
  return NextResponse.json({ klic, id: data.id }, { status: 201 });
}

/** Odvolání. Klíč se nemaže — protokol volání musí zůstat. */
export async function DELETE(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Chybí klíč." }, { status: 400 });

  const db = serviceClient();
  const { data: k } = await db.from("api_klice").select("nazev").eq("id", id)
    .maybeSingle<{ nazev: string }>();

  const { error } = await db.from("api_klice").update({
    odvolany_at: new Date().toISOString(),
    odvolal: me.id,
  }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: "apiklic.revoked", entity: "api_klice", entityId: String(id),
    actorId: me.id, source: "manual", reason: `Odvolán klíč ${k?.nazev ?? id}`,
  });

  return NextResponse.json({ ok: true });
}
