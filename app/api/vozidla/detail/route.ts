import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { uroven, smiSpravovat, smiZapsatJizdu } from "@/lib/vozidla/pristup";

export const dynamic = "force-dynamic";

/** Kniha jízd, servis a poškození jednoho vozidla. */
export async function GET(req: Request) {
  const me = await roleOf();
  if (!me || uroven(me.role) === "zadny") {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Chybí vozidlo." }, { status: 400 });

  const db = serviceClient();
  const { data: v } = await db.from("vozidla").select("ridic").eq("id", id)
    .maybeSingle<{ ridic: string | null }>();
  if (!v) return NextResponse.json({ error: "Vozidlo nenalezeno." }, { status: 404 });

  // Řidič nesmí nahlédnout do cizí knihy jízd.
  if (!smiSpravovat(me.role) && v.ridic !== me.id) {
    return NextResponse.json({ error: "Cizí vozidlo." }, { status: 403 });
  }

  const [jizdy, opravy, skody] = await Promise.all([
    db.from("kniha_jizd")
      .select("id, datum, ucel, odkud, kam, km_start, km_cil, soukroma, ridic_jmeno")
      .eq("vozidlo_id", id).order("datum", { ascending: false }).limit(200),
    db.from("servis")
      .select("id, datum, druh, popis, tachometr, cena, dodavatel")
      .eq("vozidlo_id", id).order("datum", { ascending: false }).limit(100),
    db.from("poskozeni")
      .select("id, datum, misto, popis, zavaznost, vyreseno, fotky, nahlasil_jmeno")
      .eq("vozidlo_id", id).order("created_at", { ascending: false }).limit(100),
  ]);

  return NextResponse.json({
    jizdy: jizdy.data ?? [],
    servis: opravy.data ?? [],
    poskozeni: skody.data ?? [],
  });
}

/** Zápis jízdy, servisu nebo poškození. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || uroven(me.role) === "zadny") {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const vozidlo = Number(b.vozidlo_id);
  if (!vozidlo) return NextResponse.json({ error: "Chybí vozidlo." }, { status: 400 });

  const db = serviceClient();
  const { data: v } = await db.from("vozidla").select("ridic, tachometr").eq("id", vozidlo)
    .maybeSingle<{ ridic: string | null; tachometr: number }>();
  if (!v) return NextResponse.json({ error: "Vozidlo nenalezeno." }, { status: 404 });

  if (!smiZapsatJizdu(me.role, v.ridic, me.id)) {
    return NextResponse.json({ error: "K tomuhle vozidlu nemáte přístup." }, { status: 403 });
  }

  const { data: profil } = await db.from("profiles").select("name").eq("id", me.id)
    .maybeSingle<{ name: string }>();

  // ---- servis a poškození smí zapsat kdokoli s přístupem ----
  if (b.co === "servis") {
    if (!smiSpravovat(me.role)) {
      return NextResponse.json({ error: "Servis zapisuje vedení." }, { status: 403 });
    }
    const { error } = await db.from("servis").insert({
      vozidlo_id: vozidlo,
      datum: datum(b.datum) ?? new Date().toISOString().slice(0, 10),
      druh: ["servis", "oprava", "pneu", "stk", "myti", "jine"].includes(String(b.druh)) ? b.druh : "oprava",
      popis: String(b.popis ?? "").trim().slice(0, 500) || "Bez popisu",
      tachometr: cislo(b.tachometr),
      cena: cislo(b.cena),
      dodavatel: String(b.dodavatel ?? "").trim() || null,
      zapsal: me.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (b.co === "poskozeni") {
    const { error } = await db.from("poskozeni").insert({
      vozidlo_id: vozidlo,
      misto: String(b.misto ?? "").trim().slice(0, 200) || "Neuvedeno",
      popis: String(b.popis ?? "").trim() || null,
      zavaznost: ["drobne", "stredni", "vazne"].includes(String(b.zavaznost)) ? b.zavaznost : "drobne",
      fotky: Array.isArray(b.fotky) ? b.fotky : [],
      nahlasil: me.id,
      nahlasil_jmeno: profil?.name ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ---- jízda ----
  const start = cislo(b.km_start);
  const cil = cislo(b.km_cil);
  if (start === null || cil === null) {
    return NextResponse.json({ error: "Chybí stav tachometru." }, { status: 400 });
  }
  if (cil < start) {
    return NextResponse.json({ error: "Cílový stav nemůže být nižší než výchozí." }, { status: 400 });
  }

  const { error } = await db.from("kniha_jizd").insert({
    vozidlo_id: vozidlo,
    datum: datum(b.datum) ?? new Date().toISOString().slice(0, 10),
    ucel: String(b.ucel ?? "").trim().slice(0, 200) || "Neuvedeno",
    odkud: String(b.odkud ?? "").trim() || null,
    kam: String(b.kam ?? "").trim() || null,
    km_start: start,
    km_cil: cil,
    soukroma: Boolean(b.soukroma),
    ridic: me.id,
    ridic_jmeno: profil?.name ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Tachometr se posune jen dopředu — starší jízda ho nesmí srazit.
  if (cil > v.tachometr) {
    await db.from("vozidla").update({ tachometr: cil }).eq("id", vozidlo);
  }

  return NextResponse.json({ ok: true });
}

const datum = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const cislo = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
