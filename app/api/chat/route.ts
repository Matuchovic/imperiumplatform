import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { posliTymu } from "@/lib/push/posli";

export const dynamic = "force-dynamic";

/** Kanály a zprávy. Bez kanálu vrací seznam kanálů. */
export async function GET(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const u = new URL(req.url);
  const kanal = Number(u.searchParams.get("kanal"));
  const db = serviceClient();

  if (!kanal) {
    const { data, error } = await db
      .from("kanaly").select("id, nazev, popis, soukromy")
      .order("nazev");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ kanaly: data ?? [] });
  }

  // Po dotaz „co je nového" stačí zprávy novější než dané id —
  // jinak by se při každém odsvícení tahal celý kanál znovu.
  const od = Number(u.searchParams.get("od")) || 0;
  let q = db.from("zpravy")
    .select("id, kanal_id, autor, autor_jmeno, text, created_at")
    .eq("kanal_id", kanal);

  if (od > 0) q = q.gt("id", od).order("id");
  else q = q.order("id", { ascending: false }).limit(60);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ zpravy: od > 0 ? (data ?? []) : (data ?? []).reverse() });
}

export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: { kanal?: number; text?: string; novyKanal?: string; popis?: string };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const db = serviceClient();

  if (b.novyKanal) {
    const nazev = b.novyKanal.trim().toLowerCase().slice(0, 40);
    if (!nazev) return NextResponse.json({ error: "Chybí název." }, { status: 400 });

    const { data, error } = await db.from("kanaly")
      .insert({ nazev, popis: b.popis?.trim() || null, vytvoril: me.id })
      .select("id, nazev, popis, soukromy").single();

    if (error) {
      const duvod = error.code === "23505" ? "Kanál s tímhle názvem už existuje." : error.message;
      return NextResponse.json({ error: duvod }, { status: 400 });
    }
    return NextResponse.json({ kanal: data });
  }

  const text = (b.text ?? "").trim().slice(0, 4000);
  if (!text || !b.kanal) {
    return NextResponse.json({ error: "Chybí zpráva nebo kanál." }, { status: 400 });
  }

  const { data: profil } = await db.from("profiles").select("name").eq("id", me.id)
    .maybeSingle<{ name: string }>();

  const { data, error } = await db.from("zpravy").insert({
    kanal_id: b.kanal, autor: me.id, autor_jmeno: profil?.name ?? null, text,
  }).select("id, kanal_id, autor, autor_jmeno, text, created_at").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notifikace nesmí položit odeslání zprávy — proto bez čekání
  // a s tichým odchytem.
  const { data: kanal } = await db.from("kanaly").select("nazev").eq("id", b.kanal).maybeSingle<{ nazev: string }>();
  posliTymu(me.id, "chat", {
    titulek: `#${kanal?.nazev ?? "chat"}`,
    text: `${profil?.name ?? "Někdo"}: ${text.slice(0, 120)}`,
    url: "/dashboard/chat",
    tag: `chat-${b.kanal}`,
  }).catch(() => undefined);

  return NextResponse.json({ zprava: data });
}
