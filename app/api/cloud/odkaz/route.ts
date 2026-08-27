import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { MAX_DAVKA } from "@/lib/cloud/soubory";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * Dočasné odkazy ke stažení.
 *
 * Bucket je privátní, takže se odkaz podepisuje na dvě minuty.
 * Parametr `download` vynutí uložení místo zobrazení — bez něj
 * by se PDF otevřelo na nové kartě a člověk ho musel ukládat ručně.
 */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  // Zamčený cloud nesmí vydat ani podepsaný odkaz — jinak by se
  // zámek dal obejít voláním tohohle endpointu.
  const db0 = serviceClient();
  const { data: zamek } = await db0.from("cloud_zamek")
    .select("user_id").eq("user_id", me.id).maybeSingle();
  if (zamek) {
    const jar = await cookies();
    if (jar.get("bi_cloud")?.value !== me.id) {
      return NextResponse.json({ error: "Cloud je zamčený." }, { status: 423 });
    }
  }

  let b: { ids?: number[]; nahled?: boolean };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const ids = (b.ids ?? []).filter((x) => Number.isInteger(x));
  if (ids.length === 0) return NextResponse.json({ odkazy: [] });
  if (ids.length > MAX_DAVKA) {
    return NextResponse.json({ error: `Najednou jde stáhnout nejvýš ${MAX_DAVKA} souborů.` }, { status: 400 });
  }

  const db = serviceClient();
  const { data, error } = await db.from("dokumenty")
    .select("id, nazev, ulozeni, je_slozka").in("id", ids).is("smazano_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const odkazy: { id: number; nazev: string; url: string }[] = [];
  for (const d of data ?? []) {
    if (d.je_slozka || !d.ulozeni) continue;
    const { data: podpis } = await db.storage
      .from("cloud")
      .createSignedUrl(d.ulozeni as string, 120, b.nahled ? {} : { download: d.nazev as string });
    if (podpis?.signedUrl) {
      odkazy.push({ id: d.id as number, nazev: d.nazev as string, url: podpis.signedUrl });
    }
  }

  return NextResponse.json({ odkazy });
}
