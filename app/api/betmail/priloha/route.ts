import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";

export const dynamic = "force-dynamic";

/**
 * Odkaz na přílohu zprávy.
 *
 * Vydá se jen tomu, kdo je odesílatel nebo příjemce. PIN cloudu se
 * tu nevyžaduje schválně — chrání procházení celého úložiště, kdežto
 * příloha byla poslána konkrétnímu člověku.
 */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: { zprava?: number; soubor?: number };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  if (typeof b.zprava !== "number" || typeof b.soubor !== "number") {
    return NextResponse.json({ error: "Chybí zpráva nebo soubor." }, { status: 400 });
  }

  const db = serviceClient();
  const { data: zprava } = await db.from("betmail")
    .select("odesilatel, prijemce, prilohy").eq("id", b.zprava)
    .maybeSingle<{ odesilatel: string; prijemce: string; prilohy: number[] }>();

  if (!zprava) return NextResponse.json({ error: "Zpráva nenalezena." }, { status: 404 });
  if (zprava.odesilatel !== me.id && zprava.prijemce !== me.id) {
    return NextResponse.json({ error: "Cizí zpráva." }, { status: 403 });
  }
  // Soubor musí být přílohou právě téhle zprávy — jinak by šlo
  // přes cizí id vytáhnout cokoli z cloudu.
  if (!zprava.prilohy.includes(b.soubor)) {
    return NextResponse.json({ error: "Soubor k téhle zprávě nepatří." }, { status: 403 });
  }

  const { data: dok } = await db.from("dokumenty")
    .select("nazev, ulozeni, velikost, typ").eq("id", b.soubor)
    .maybeSingle<{ nazev: string; ulozeni: string | null; velikost: number; typ: string | null }>();

  if (!dok?.ulozeni) return NextResponse.json({ error: "Soubor nenalezen." }, { status: 404 });

  // Deset minut — dost na přečtení dlouhého dokumentu, málo na sdílení.
  const { data: podpis } = await db.storage.from("cloud").createSignedUrl(dok.ulozeni, 600);
  if (!podpis?.signedUrl) {
    return NextResponse.json({ error: "Odkaz se nepodařilo vytvořit." }, { status: 500 });
  }

  return NextResponse.json({
    nazev: dok.nazev, velikost: dok.velikost, typ: dok.typ, url: podpis.signedUrl,
  });
}
