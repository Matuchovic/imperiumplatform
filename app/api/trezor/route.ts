import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf, requireAdmin } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { zasifruj, desifruj, trezorPripraven } from "@/lib/trezor/sifra";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

/** Seznam položek — bez hesel. Ta se vydávají jen jednotlivě. */
export async function GET() {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }
  if (!trezorPripraven()) {
    return NextResponse.json({ error: "Trezor není nastavený — chybí TREZOR_KLIC." }, { status: 503 });
  }

  const db = serviceClient();
  const { data, error } = await db
    .from("trezor")
    .select("id, nazev, kategorie, uzivatel, url, poznamka, updated_at")
    .order("kategorie").order("nazev");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ polozky: data ?? [] });
}

/** Odhalení jednoho hesla. Zapíše se do auditu i do přístupů. */
export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: { id?: number };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }
  if (typeof b.id !== "number") return NextResponse.json({ error: "Chybí položka." }, { status: 400 });

  const db = serviceClient();
  const { data } = await db.from("trezor").select("nazev, tajemstvi").eq("id", b.id)
    .maybeSingle<{ nazev: string; tajemstvi: string }>();

  if (!data) return NextResponse.json({ error: "Nenalezeno." }, { status: 404 });

  const heslo = desifruj(data.tajemstvi);
  if (heslo === null) {
    log("error", "trezor", "dešifrování selhalo", { id: b.id });
    return NextResponse.json({ error: "Hodnotu se nepodařilo přečíst. Změnil se TREZOR_KLIC?" }, { status: 500 });
  }

  const { data: profil } = await db.from("profiles").select("name").eq("id", me.id)
    .maybeSingle<{ name: string }>();

  // Zápis přístupu je to, co dělá z trezoru trezor. Bez něj je to
  // sdílená složka s hesly.
  await db.from("trezor_pristupy").insert({
    polozka_id: b.id, user_id: me.id, jmeno: profil?.name ?? null, akce: "zobrazeno",
  });
  await audit({
    action: "trezor.revealed", entity: "trezor", entityId: String(b.id),
    actorId: me.id, source: "manual", reason: `Zobrazeno heslo: ${data.nazev}`,
  });

  return NextResponse.json({ heslo });
}

/** Nová položka. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: Record<string, string>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const nazev = (b.nazev ?? "").trim();
  const tajemstvi = b.tajemstvi ?? "";
  if (!nazev || !tajemstvi) {
    return NextResponse.json({ error: "Chybí název nebo heslo." }, { status: 400 });
  }

  const sifra = zasifruj(tajemstvi);
  if (!sifra) return NextResponse.json({ error: "Trezor není nastavený." }, { status: 503 });

  const db = serviceClient();
  const { data, error } = await db.from("trezor").insert({
    nazev,
    kategorie: ["sluzba", "databaze", "platby", "socialni", "ostatni"].includes(b.kategorie)
      ? b.kategorie : "ostatni",
    uzivatel: b.uzivatel?.trim() || null,
    tajemstvi: sifra,
    url: b.url?.trim() || null,
    poznamka: b.poznamka?.trim() || null,
    vlozil: me.id,
  }).select("id, nazev, kategorie, uzivatel, url, poznamka, updated_at").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: "trezor.created", entity: "trezor", entityId: String(data.id),
    actorId: me.id, source: "manual", reason: `Vložena položka: ${nazev}`,
  });

  return NextResponse.json({ polozka: data });
}

/** Smazání. Jen správce — ztráta hesla je nevratná. */
export async function DELETE(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Chybí položka." }, { status: 400 });

  const db = serviceClient();
  const { data } = await db.from("trezor").select("nazev").eq("id", id)
    .maybeSingle<{ nazev: string }>();

  const { error } = await db.from("trezor").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: "trezor.deleted", entity: "trezor", entityId: String(id),
    actorId: me.id, source: "manual", reason: `Smazána položka: ${data?.nazev ?? id}`,
  });

  return NextResponse.json({ ok: true });
}
