import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf, requireAdmin } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { cestaVUlozisti, MAX_DAVKA, MAX_SOUBOR } from "@/lib/cloud/soubory";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "cloud";

/**
 * Zámek se ověřuje na serveru, ne jen v rozhraní.
 *
 * Kdyby stačilo schovat obrazovku, dala by se obejít přímým voláním
 * API — a zámek by byl jen dekorace.
 */
async function odemceno(userId: string): Promise<boolean> {
  const db = serviceClient();
  const { data } = await db.from("cloud_zamek").select("user_id").eq("user_id", userId).maybeSingle();
  // Kdo PIN nemá nastavený, nemá co odemykat.
  if (!data) return true;

  const jar = await cookies();
  return jar.get("bi_cloud")?.value === userId;
}

/** Obsah složky, koš a obsazení úložiště. */
export async function GET(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }
  if (!(await odemceno(me.id))) {
    return NextResponse.json({ error: "Cloud je zamčený." }, { status: 423 });
  }
  if (!(await odemceno(me.id))) {
    return NextResponse.json({ error: "Cloud je zamčený." }, { status: 423 });
  }
  if (!(await odemceno(me.id))) {
    return NextResponse.json({ error: "Cloud je zamčený." }, { status: 423 });
  }
  if (!(await odemceno(me.id))) {
    return NextResponse.json({ error: "Cloud je zamčený." }, { status: 423 });
  }

  const u = new URL(req.url);
  const kos = u.searchParams.get("kos") === "1";
  const rodic = u.searchParams.get("rodic");
  const db = serviceClient();

  let q = db.from("dokumenty")
    .select("id, nazev, je_slozka, rodic_id, velikost, typ, druh, vlozil_jmeno, created_at, smazano_at");

  if (kos) {
    q = q.not("smazano_at", "is", null).order("smazano_at", { ascending: false });
  } else {
    q = q.is("smazano_at", null);
    q = rodic ? q.eq("rodic_id", Number(rodic)) : q.is("rodic_id", null);
    // Složky nahoru, pak podle názvu — jinak se hledá očima.
    q = q.order("je_slozka", { ascending: false }).order("nazev");
  }

  const [polozky, obsazeni] = await Promise.all([
    q.limit(500),
    db.rpc("obsazeni_cloudu").maybeSingle(),
  ]);

  if (polozky.error) return NextResponse.json({ error: polozky.error.message }, { status: 500 });

  // Cesta k aktuální složce, aby se dalo vrátit o úroveň výš.
  const cesta: { id: number; nazev: string }[] = [];
  if (rodic) {
    // Typ řádku pojmenovaný předem. Bez toho by se `id` odvozovalo
    // z `data` a `data` z `id` — kruhová závislost, kterou
    // TypeScript nerozplete.
    type Uzel = { id: number; nazev: string; rodic_id: number | null };

    let id: number | null = Number(rodic);
    // Strop proti zacyklení, kdyby data byla poškozená.
    for (let i = 0; i < 12 && id !== null; i++) {
      const vysledek = await db
        .from("dokumenty").select("id, nazev, rodic_id").eq("id", id)
        .maybeSingle<Uzel>();

      const uzel: Uzel | null = vysledek.data;
      if (!uzel) break;
      cesta.unshift({ id: uzel.id, nazev: uzel.nazev });
      id = uzel.rodic_id;
    }
  }

  return NextResponse.json({
    polozky: polozky.data ?? [],
    cesta,
    obsazeni: obsazeni.data ?? { celkem: 0, aktivni: 0, kos: 0, osirele: 0 },
  });
}

/** Nahrání souboru nebo založení složky. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const db = serviceClient();
  const { data: profil } = await db.from("profiles").select("name").eq("id", me.id)
    .maybeSingle<{ name: string }>();

  const typ = req.headers.get("content-type") ?? "";

  // ---- složka ----
  if (typ.includes("application/json")) {
    let b: { nazev?: string; rodic?: number };
    try { b = await req.json(); }
    catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

    const nazev = (b.nazev ?? "").trim().slice(0, 120);
    if (!nazev) return NextResponse.json({ error: "Chybí název složky." }, { status: 400 });

    const { data, error } = await db.from("dokumenty").insert({
      nazev, je_slozka: true, rodic_id: b.rodic ?? null,
      vlozil: me.id, vlozil_jmeno: profil?.name ?? null,
    }).select("id, nazev, je_slozka, rodic_id, velikost, typ, druh, vlozil_jmeno, created_at").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ polozka: data });
  }

  // ---- soubor ----
  const form = await req.formData();
  const soubor = form.get("soubor") as File | null;
  if (!soubor) return NextResponse.json({ error: "Chybí soubor." }, { status: 400 });

  if (soubor.size > MAX_SOUBOR) {
    return NextResponse.json(
      { error: `Soubor je větší než ${Math.round(MAX_SOUBOR / 1024 / 1024)} MB.` },
      { status: 413 }
    );
  }

  const rodic = form.get("rodic") ? Number(form.get("rodic")) : null;
  const druh = String(form.get("druh") ?? "ostatni");
  const cesta = cestaVUlozisti(soubor.name);

  const { error: chybaUlozeni } = await db.storage
    .from(BUCKET)
    .upload(cesta, soubor, { contentType: soubor.type || undefined, upsert: false });

  if (chybaUlozeni) {
    log("error", "cloud", "nahrání do úložiště selhalo", { error: chybaUlozeni.message });
    return NextResponse.json({ error: `Nahrání selhalo: ${chybaUlozeni.message}` }, { status: 500 });
  }

  const { data, error } = await db.from("dokumenty").insert({
    nazev: soubor.name.slice(0, 200),
    je_slozka: false,
    rodic_id: rodic,
    ulozeni: cesta,
    velikost: soubor.size,
    typ: soubor.type || null,
    druh: ["smlouva", "faktura", "vypis", "doklad", "report", "ostatni"].includes(druh) ? druh : "ostatni",
    vlozil: me.id,
    vlozil_jmeno: profil?.name ?? null,
  }).select("id, nazev, je_slozka, rodic_id, velikost, typ, druh, vlozil_jmeno, created_at").single();

  if (error) {
    // Zápis selhal, ale soubor už v bucketu leží — bez úklidu
    // by tam zůstal jako osiřelý a zabíral místo navždy.
    await db.storage.from(BUCKET).remove([cesta]).catch(() => undefined);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ polozka: data });
}

/** Do koše, nebo zpět z koše. */
export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: { id?: number; obnovit?: boolean };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }
  if (typeof b.id !== "number") return NextResponse.json({ error: "Chybí položka." }, { status: 400 });

  const db = serviceClient();
  const { error } = await db.from("dokumenty")
    .update({ smazano_at: b.obnovit ? null : new Date().toISOString() })
    .eq("id", b.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Trvalé smazání z koše. Jen správce — z úložiště to nejde vzít zpět. */
export async function DELETE(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Chybí položka." }, { status: 400 });

  const db = serviceClient();
  const { data } = await db.from("dokumenty").select("nazev, ulozeni, je_slozka").eq("id", id)
    .maybeSingle<{ nazev: string; ulozeni: string | null; je_slozka: boolean }>();

  if (!data) return NextResponse.json({ error: "Nenalezeno." }, { status: 404 });

  // Nejdřív z úložiště. Kdyby to selhalo, řádek zůstane a jde
  // to zkusit znovu — opačné pořadí by vyrobilo osiřelý soubor.
  if (data.ulozeni) {
    const { error } = await db.storage.from(BUCKET).remove([data.ulozeni]);
    if (error) {
      log("error", "cloud", "mazání z úložiště selhalo", { id, error: error.message });
      return NextResponse.json({ error: "Soubor se nepodařilo smazat z úložiště." }, { status: 500 });
    }
  }

  await db.from("dokumenty").delete().eq("id", id);
  await audit({
    action: "cloud.deleted", entity: "dokumenty", entityId: String(id),
    actorId: me.id, source: "manual", reason: `Trvale smazáno: ${data.nazev}`,
  });

  return NextResponse.json({ ok: true });
}
