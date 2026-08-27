import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const db = serviceClient();
  const { data, error } = await db
    .from("poznamky")
    .select("id, text, sdilena, hotovo, autor, autor_jmeno, created_at")
    .or(`sdilena.eq.true,autor.eq.${me.id}`)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ poznamky: data ?? [] });
}

export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: { text?: string; sdilena?: boolean };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const text = (b.text ?? "").trim().slice(0, 2000);
  if (!text) return NextResponse.json({ error: "Prázdná poznámka." }, { status: 400 });

  const db = serviceClient();
  const { data: profil } = await db.from("profiles").select("name").eq("id", me.id)
    .maybeSingle<{ name: string }>();

  const { data, error } = await db.from("poznamky").insert({
    text,
    sdilena: Boolean(b.sdilena),
    autor: me.id,
    autor_jmeno: profil?.name ?? null,
  }).select("id, text, sdilena, hotovo, autor, autor_jmeno, created_at").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ poznamka: data });
}

export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: { id?: number; hotovo?: boolean };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }
  if (typeof b.id !== "number") return NextResponse.json({ error: "Chybí poznámka." }, { status: 400 });

  const db = serviceClient();
  const { error } = await db.from("poznamky").update({ hotovo: Boolean(b.hotovo) }).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Chybí poznámka." }, { status: 400 });

  const db = serviceClient();
  const { data } = await db.from("poznamky").select("autor, sdilena").eq("id", id)
    .maybeSingle<{ autor: string; sdilena: boolean }>();

  if (!data) return NextResponse.json({ error: "Nenalezeno." }, { status: 404 });
  if (!data.sdilena && data.autor !== me.id) {
    return NextResponse.json({ error: "Cizí osobní poznámka." }, { status: 403 });
  }

  const { error } = await db.from("poznamky").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
