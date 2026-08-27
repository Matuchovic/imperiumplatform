import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { REAKCE } from "@/lib/betmail/zpravy";

export const dynamic = "force-dynamic";

/** Přidání nebo odebrání reakce. Druhé klepnutí ji sundá. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: { id?: number; znak?: string };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const znak = String(b.znak ?? "");
  // Jen ze seznamu — jinak by šlo do databáze poslat cokoli.
  if (typeof b.id !== "number" || !(REAKCE as readonly string[]).includes(znak)) {
    return NextResponse.json({ error: "Neplatná reakce." }, { status: 400 });
  }

  const db = serviceClient();
  const { data: uz } = await db.from("betmail_reakce")
    .select("znak").eq("zprava_id", b.id).eq("user_id", me.id).eq("znak", znak).maybeSingle();

  if (uz) {
    await db.from("betmail_reakce").delete()
      .eq("zprava_id", b.id).eq("user_id", me.id).eq("znak", znak);
    return NextResponse.json({ ok: true, pridano: false });
  }

  const { error } = await db.from("betmail_reakce")
    .insert({ zprava_id: b.id, user_id: me.id, znak });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, pridano: true });
}
