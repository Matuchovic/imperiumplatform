import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { EFEKTY } from "@/lib/avatar";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  let b: { efekt?: string };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  // Neznámý efekt spadne na žádný — ne na chybu.
  const efekt = EFEKTY.some((e) => e.klic === b.efekt) ? b.efekt : "zadny";

  const db = serviceClient();
  const { error } = await db.from("profiles").update({ avatar_efekt: efekt }).eq("id", me.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, efekt });
}
