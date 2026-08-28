import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/**
 * Protokol volání.
 *
 * Bez něj se nedá zjistit, proč formulář na webu nefunguje —
 * jestli klíč nesedí, doména neprošla, nebo přišla neúplná data.
 */
export async function GET(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  const u = new URL(req.url);
  const klic = Number(u.searchParams.get("klic"));
  const jenChyby = u.searchParams.get("chyby") === "1";

  const db = serviceClient();
  let q = db.from("api_volani")
    .select("id, klic_id, cesta, metoda, stav, ip, puvod, trvani_ms, chyba, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (klic) q = q.eq("klic_id", klic);
  if (jenChyby) q = q.gte("stav", 400);

  const [volani, podezreni] = await Promise.all([
    q,
    db.from("api_podezreni")
      .select("id, klic_id, druh, popis, podrobnosti, vyreseno_at, created_at")
      .is("vyreseno_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    volani: volani.data ?? [],
    podezreni: podezreni.data ?? [],
  });
}

/** Označení podezření za vyřešené. */
export async function PUT(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  let b: { id?: number };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Chybí podezření." }, { status: 400 });

  const db = serviceClient();
  const { error } = await db.from("api_podezreni")
    .update({ vyreseno_at: new Date().toISOString() })
    .eq("id", b.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
