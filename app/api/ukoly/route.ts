import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";

export const dynamic = "force-dynamic";

/** Přepnutí stavu úkolu. */
export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let body: { id?: number; hotovo?: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  if (typeof body.id !== "number") {
    return NextResponse.json({ error: "Chybí úkol." }, { status: 400 });
  }

  const db = serviceClient();
  const { error } = await db
    .from("ukoly")
    .update({
      hotovo: Boolean(body.hotovo),
      hotovo_at: body.hotovo ? new Date().toISOString() : null,
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
