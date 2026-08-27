import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { uroven, smiSpravovat } from "@/lib/vozidla/pristup";
import { normalizujSpz } from "@/lib/vozidla/lhuty";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Vozidla a karty.
 *
 * Cizí vozidla se řidiči vůbec nenačtou — filtr je v dotazu,
 * ne v rozhraní.
 */
export async function GET() {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  const u = uroven(me.role);
  if (u === "zadny") return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  const db = serviceClient();

  let vq = db.from("vozidla").select(
    "id, spz, znacka, model, rok, palivo, vin, barva, tachometr, stav, ridic, ridic_jmeno, " +
    "stk_do, pojisteni_do, znamka_do, servis_do, poznamka"
  );
  let kq = db.from("tankovaci_karty").select(
    "id, cislo, vydavatel, platnost_do, limit_mesic, vozidlo_id, drzitel, drzitel_jmeno, aktivni, poznamka"
  );

  if (u === "ridic") {
    vq = vq.eq("ridic", me.id);
    // Karta se řidiči ukáže jen když je jeho, nebo patří jeho vozidlu.
    kq = kq.eq("drzitel", me.id);
  }

  const [vozidla, karty, lide] = await Promise.all([
    vq.order("spz"),
    kq.order("cislo"),
    u === "vedeni"
      ? db.from("profiles").select("id, name").neq("role", "klient").order("name")
      : Promise.resolve({ data: [] }),
  ]);

  if (vozidla.error) return NextResponse.json({ error: vozidla.error.message }, { status: 500 });

  return NextResponse.json({
    vozidla: vozidla.data ?? [],
    karty: karty.data ?? [],
    lide: lide.data ?? [],
    uroven: u,
    smiSpravovat: smiSpravovat(me.role),
  });
}

/** Nové vozidlo nebo karta. Jen vedení. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !smiSpravovat(me.role)) {
    return NextResponse.json({ error: "Zakládat smí jen vedení." }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const db = serviceClient();

  if (b.co === "karta") {
    const cislo = String(b.cislo ?? "").trim();
    if (!cislo) return NextResponse.json({ error: "Chybí číslo karty." }, { status: 400 });

    const { data, error } = await db.from("tankovaci_karty").insert({
      cislo,
      vydavatel: String(b.vydavatel ?? "").trim() || null,
      platnost_do: datum(b.platnost_do),
      limit_mesic: cislo_ci_null(b.limit_mesic),
      vozidlo_id: typeof b.vozidlo_id === "number" ? b.vozidlo_id : null,
      drzitel: (b.drzitel as string) || null,
      drzitel_jmeno: (b.drzitel_jmeno as string) || null,
      poznamka: String(b.poznamka ?? "").trim() || null,
    }).select().single();

    if (error) {
      const duvod = error.code === "23505" ? "Karta s tímhle číslem už existuje." : error.message;
      return NextResponse.json({ error: duvod }, { status: 400 });
    }
    return NextResponse.json({ karta: data });
  }

  const spz = String(b.spz ?? "").trim();
  const znacka = String(b.znacka ?? "").trim();
  if (!spz || !znacka) {
    return NextResponse.json({ error: "Chybí SPZ nebo značka." }, { status: 400 });
  }

  const { data, error } = await db.from("vozidla").insert({
    spz: normalizujSpz(spz),
    znacka,
    model: String(b.model ?? "").trim() || null,
    rok: cislo_ci_null(b.rok),
    palivo: ["benzin", "nafta", "elektro", "hybrid", "lpg", "cng"].includes(String(b.palivo))
      ? b.palivo : null,
    vin: String(b.vin ?? "").trim() || null,
    barva: String(b.barva ?? "").trim() || null,
    tachometr: cislo_ci_null(b.tachometr) ?? 0,
    stav: ["aktivni", "servis", "odstaveno", "vyrazeno"].includes(String(b.stav)) ? b.stav : "aktivni",
    ridic: (b.ridic as string) || null,
    ridic_jmeno: (b.ridic_jmeno as string) || null,
    stk_do: datum(b.stk_do),
    pojisteni_do: datum(b.pojisteni_do),
    znamka_do: datum(b.znamka_do),
    servis_do: datum(b.servis_do),
    poznamka: String(b.poznamka ?? "").trim() || null,
  }).select().single();

  if (error) {
    const duvod = error.code === "23505" ? "Vozidlo s touhle SPZ už existuje." : error.message;
    return NextResponse.json({ error: duvod }, { status: 400 });
  }

  await audit({
    action: "vozidlo.created", entity: "vozidla", entityId: String(data.id),
    actorId: me.id, source: "manual", reason: `Přidáno vozidlo ${spz}`,
  });

  return NextResponse.json({ vozidlo: data });
}

/** Úprava. Doklady jen vedení, tachometr i řidič svého vozidla. */
export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me || uroven(me.role) === "zadny") {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "Chybí vozidlo." }, { status: 400 });

  const db = serviceClient();
  const { data: v } = await db.from("vozidla").select("ridic, spz").eq("id", id)
    .maybeSingle<{ ridic: string | null; spz: string }>();
  if (!v) return NextResponse.json({ error: "Vozidlo nenalezeno." }, { status: 404 });

  // Řidič smí jen tachometr, a jen u svého auta.
  if (!smiSpravovat(me.role)) {
    if (v.ridic !== me.id) {
      return NextResponse.json({ error: "Cizí vozidlo." }, { status: 403 });
    }
    const tach = cislo_ci_null(b.tachometr);
    if (tach === null) {
      return NextResponse.json({ error: "Upravovat smíte jen stav tachometru." }, { status: 403 });
    }
    const { error } = await db.from("vozidla").update({ tachometr: tach }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const zmena: Record<string, unknown> = {};
  for (const k of ["znacka", "model", "vin", "barva", "poznamka", "ridic_jmeno"]) {
    if (k in b) zmena[k] = String(b[k] ?? "").trim() || null;
  }
  for (const k of ["stk_do", "pojisteni_do", "znamka_do", "servis_do"]) {
    if (k in b) zmena[k] = datum(b[k]);
  }
  for (const k of ["rok", "tachometr"]) {
    if (k in b) zmena[k] = cislo_ci_null(b[k]);
  }
  if ("spz" in b) zmena.spz = normalizujSpz(String(b.spz));
  if ("ridic" in b) zmena.ridic = (b.ridic as string) || null;
  if ("stav" in b && ["aktivni", "servis", "odstaveno", "vyrazeno"].includes(String(b.stav))) {
    zmena.stav = b.stav;
  }
  if ("palivo" in b) {
    zmena.palivo = ["benzin", "nafta", "elektro", "hybrid", "lpg", "cng"].includes(String(b.palivo))
      ? b.palivo : null;
  }

  const { error } = await db.from("vozidla").update(zmena).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/** Smazání. Jen vedení — s vozidlem zmizí i kniha jízd a servis. */
export async function DELETE(req: Request) {
  const me = await roleOf();
  if (!me || !smiSpravovat(me.role)) {
    return NextResponse.json({ error: "Mazat smí jen vedení." }, { status: 403 });
  }

  const u = new URL(req.url);
  const id = Number(u.searchParams.get("id"));
  const co = u.searchParams.get("co") ?? "vozidlo";
  if (!id) return NextResponse.json({ error: "Chybí položka." }, { status: 400 });

  const db = serviceClient();
  const tabulka = co === "karta" ? "tankovaci_karty" : "vozidla";

  if (co === "vozidlo") {
    const { data } = await db.from("vozidla").select("spz").eq("id", id)
      .maybeSingle<{ spz: string }>();
    await audit({
      action: "vozidlo.deleted", entity: "vozidla", entityId: String(id),
      actorId: me.id, source: "manual", reason: `Smazáno vozidlo ${data?.spz ?? id}`,
    });
  }

  const { error } = await db.from(tabulka).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

const datum = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const cislo_ci_null = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
