import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { soucty, dalsiCislo, splatnostZa, type Polozka } from "@/lib/faktury/polozky";
import { vsZCisla } from "@/lib/faktury/stav";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const smi = (role: string) => ["ceo", "vyvojar", "ucetni", "manazer"].includes(role);

/** Faktury, upomínky a fakturační údaje firmy. */
export async function GET() {
  const me = await roleOf();
  if (!me || !smi(me.role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const db = serviceClient();
  const [faktury, upominky, udaje, klienti] = await Promise.all([
    db.from("faktury").select("*").order("cislo", { ascending: false }).limit(500),
    db.from("upominky").select("faktura_id, uroven, odeslano_at, odeslal_jmeno")
      .order("odeslano_at", { ascending: false }).limit(500),
    db.from("fakturacni_udaje").select("*").eq("id", 1).maybeSingle(),
    db.from("profiles").select("id, name").eq("role", "klient").order("name"),
  ]);

  if (faktury.error) return NextResponse.json({ error: faktury.error.message }, { status: 500 });

  return NextResponse.json({
    faktury: faktury.data ?? [],
    upominky: upominky.data ?? [],
    udaje: udaje.data ?? null,
    klienti: klienti.data ?? [],
  });
}

/** Nová faktura. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !smi(me.role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const odberatel = String(b.odberatel ?? "").trim();
  const polozky = (Array.isArray(b.polozky) ? b.polozky : []) as Polozka[];
  if (!odberatel) return NextResponse.json({ error: "Chybí odběratel." }, { status: 400 });
  if (polozky.length === 0) return NextResponse.json({ error: "Faktura nemá položky." }, { status: 400 });

  const db = serviceClient();
  const { data: udaje } = await db.from("fakturacni_udaje").select("platce_dph, splatnost_dni")
    .eq("id", 1).maybeSingle<{ platce_dph: boolean; splatnost_dni: number }>();

  // Číslo se bere z poslední faktury roku. Řada nesmí mít mezery.
  const rok = new Date().getFullYear();
  const { data: posledni } = await db.from("faktury")
    .select("cislo").like("cislo", `${rok}%`)
    .order("cislo", { ascending: false }).limit(1).maybeSingle<{ cislo: string }>();

  const cislo = dalsiCislo(rok, posledni?.cislo ?? null);
  const vystaveno = datum(b.vystaveno) ?? new Date().toISOString().slice(0, 10);
  const s = soucty(polozky, udaje?.platce_dph ?? false);

  const { data, error } = await db.from("faktury").insert({
    cislo,
    klient_id: (b.klient_id as string) || null,
    odberatel,
    odberatel_ico: String(b.odberatel_ico ?? "").trim() || null,
    odberatel_dic: String(b.odberatel_dic ?? "").trim() || null,
    odberatel_adresa: String(b.odberatel_adresa ?? "").trim() || null,
    odberatel_email: String(b.odberatel_email ?? "").trim() || null,
    vystaveno,
    splatnost: datum(b.splatnost) ?? splatnostZa(vystaveno, udaje?.splatnost_dni ?? 14),
    duzp: datum(b.duzp) ?? vystaveno,
    polozky,
    bez_dph: s.bezDph,
    dph: s.dph,
    castka: s.celkem,
    vs: String(b.vs ?? "").trim() || vsZCisla(cislo),
    zpusob: ["prevod", "hotove", "karta"].includes(String(b.zpusob)) ? b.zpusob : "prevod",
    stav: b.stav === "vystavena" ? "vystavena" : "koncept",
    opakovana: Boolean(b.opakovana),
    opakovat_po: cislo_ci_null(b.opakovat_po),
    poznamka: String(b.poznamka ?? "").trim() || null,
    vystavil: me.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: "faktura.created", entity: "faktury", entityId: String(data.id),
    actorId: me.id, source: "manual",
    reason: `Vystavena faktura ${cislo} pro ${odberatel} na ${s.celkem} Kč`,
  });

  return NextResponse.json({ faktura: data });
}

/** Úprava, změna stavu, zaplacení. */
export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me || !smi(me.role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "Chybí faktura." }, { status: 400 });

  const db = serviceClient();
  const { data: f } = await db.from("faktury").select("cislo, stav").eq("id", id)
    .maybeSingle<{ cislo: string; stav: string }>();
  if (!f) return NextResponse.json({ error: "Faktura nenalezena." }, { status: 404 });

  const zmena: Record<string, unknown> = {};

  if (b.stav && ["koncept", "vystavena", "zaplacena", "stornovana"].includes(String(b.stav))) {
    zmena.stav = b.stav;
    // Datum úhrady se zapíše jen při přechodu na zaplacenou.
    zmena.zaplaceno_at = b.stav === "zaplacena" ? new Date().toISOString() : null;
  }

  if (Array.isArray(b.polozky)) {
    // Vystavenou fakturu nelze měnit — je to daňový doklad.
    if (f.stav !== "koncept") {
      return NextResponse.json(
        { error: "Vystavenou fakturu nelze upravovat. Vystav opravný doklad." },
        { status: 400 }
      );
    }
    const { data: udaje } = await db.from("fakturacni_udaje").select("platce_dph").eq("id", 1)
      .maybeSingle<{ platce_dph: boolean }>();
    const s = soucty(b.polozky as Polozka[], udaje?.platce_dph ?? false);
    zmena.polozky = b.polozky;
    zmena.bez_dph = s.bezDph;
    zmena.dph = s.dph;
    zmena.castka = s.celkem;
  }

  for (const k of ["odberatel", "odberatel_ico", "odberatel_dic", "odberatel_adresa",
                   "odberatel_email", "vs", "poznamka"]) {
    if (k in b) zmena[k] = String(b[k] ?? "").trim() || null;
  }
  for (const k of ["vystaveno", "splatnost", "duzp"]) {
    if (k in b) zmena[k] = datum(b[k]);
  }
  if ("opakovana" in b) zmena.opakovana = Boolean(b.opakovana);

  const { error } = await db.from("faktury").update(zmena).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (b.stav === "zaplacena") {
    await audit({
      action: "faktura.paid", entity: "faktury", entityId: String(id),
      actorId: me.id, source: "manual", reason: `Faktura ${f.cislo} označena jako zaplacená`,
    });
  }

  return NextResponse.json({ ok: true });
}

/** Smazání konceptu. Vystavená faktura se stornuje, nemaže. */
export async function DELETE(req: Request) {
  const me = await roleOf();
  if (!me || !smi(me.role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Chybí faktura." }, { status: 400 });

  const db = serviceClient();
  const { data: f } = await db.from("faktury").select("cislo, stav").eq("id", id)
    .maybeSingle<{ cislo: string; stav: string }>();
  if (!f) return NextResponse.json({ error: "Faktura nenalezena." }, { status: 404 });

  // Vystavený daňový doklad musí zůstat v řadě, jinak v ní vznikne mezera.
  if (f.stav !== "koncept") {
    return NextResponse.json(
      { error: "Vystavenou fakturu nelze smazat — použij storno." },
      { status: 400 }
    );
  }

  const { error } = await db.from("faktury").delete().eq("id", id);
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
