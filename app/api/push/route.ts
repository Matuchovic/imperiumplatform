import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { nazevZarizeni, VYCHOZI_VOLBY } from "@/lib/push/druhy";
import { pushPripraven } from "@/lib/push/posli";

export const dynamic = "force-dynamic";

/** Volby a přehled zařízení. */
export async function GET() {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  const db = serviceClient();
  const [volby, odbery] = await Promise.all([
    db.from("notifikace_volby").select("*").eq("user_id", me.id).maybeSingle(),
    db.from("push_odbery").select("id, endpoint, zarizeni, created_at").eq("user_id", me.id),
  ]);

  return NextResponse.json({
    volby: volby.data ?? { user_id: me.id, ...VYCHOZI_VOLBY },
    zarizeni: odbery.data ?? [],
    pripraveno: pushPripraven(),
    verejnyKlic: process.env.NEXT_PUBLIC_VAPID_KLIC ?? null,
  });
}

/** Přihlášení zařízení k odběru. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  let b: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  if (!b.endpoint || !b.keys?.p256dh || !b.keys?.auth) {
    return NextResponse.json({ error: "Neúplný odběr." }, { status: 400 });
  }

  const db = serviceClient();
  // Endpoint je jedinečný, takže opakované povolení odběr aktualizuje
  // místo aby vyrobilo duplicitu.
  const { error } = await db.from("push_odbery").upsert({
    user_id: me.id,
    endpoint: b.endpoint,
    p256dh: b.keys.p256dh,
    auth: b.keys.auth,
    zarizeni: nazevZarizeni(req.headers.get("user-agent") ?? ""),
    posledni_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Při prvním odběru se založí výchozí volby.
  await db.from("notifikace_volby")
    .upsert({ user_id: me.id, ...VYCHOZI_VOLBY }, { onConflict: "user_id", ignoreDuplicates: true });

  return NextResponse.json({ ok: true });
}

/** Uložení voleb. */
export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const db = serviceClient();
  const { error } = await db.from("notifikace_volby").upsert({
    user_id: me.id,
    chat: Boolean(b.chat),
    kalendar: Boolean(b.kalendar),
    asistent: Boolean(b.asistent),
    kandidati: Boolean(b.kandidati),
    support: Boolean(b.support),
    ukoly: Boolean(b.ukoly),
    ticho_od: (b.ticho_od as string) || null,
    ticho_do: (b.ticho_do as string) || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Odhlášení zařízení. */
export async function DELETE(req: Request) {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Chybí zařízení." }, { status: 400 });

  const db = serviceClient();
  const { error } = await db.from("push_odbery").delete().eq("id", id).eq("user_id", me.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
