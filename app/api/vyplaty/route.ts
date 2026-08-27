import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf, requireAdmin } from "@/lib/auth/guard";
import { prvniDen } from "@/lib/vyplaty/vypocet";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Kdo smí do výplat. Mzdy kolegů nejsou pro celý tým. */
const smi = (role: string) => ["ceo", "vyvojar", "ucetni"].includes(role);

/**
 * Řádky za období.
 *
 * Chybějící řádky se dopočítají z lidí — kdo je v týmu, má se
 * v období objevit, i když se mu ještě nic nevyplnilo.
 */
export async function GET(req: Request) {
  const me = await roleOf();
  if (!me || !smi(me.role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const u = new URL(req.url);
  const dnes = new Date();
  const obdobi = u.searchParams.get("obdobi") ?? prvniDen(dnes.getFullYear(), dnes.getMonth());

  const db = serviceClient();
  const [radky, lide] = await Promise.all([
    db.from("vyplaty").select("*").eq("obdobi", obdobi),
    db.from("profiles")
      .select("id, name, role, uvazek, sazba_hod, mesicni_plat, ukonceni")
      .neq("role", "klient").order("name"),
  ]);

  if (radky.error) return NextResponse.json({ error: radky.error.message }, { status: 500 });

  const podleCloveka = new Map((radky.data ?? []).map((r) => [r.user_id as string, r]));

  const seznam = ((lide.data ?? []) as {
    id: string; name: string; role: string; uvazek: string | null;
    sazba_hod: number | null; mesicni_plat: number | null; ukonceni: string | null;
  }[])
    // Kdo odešel před tímhle obdobím, na výplatní listině nemá co dělat.
    .filter((l) => !l.ukonceni || l.ukonceni >= obdobi)
    .map((l) => {
      const r = podleCloveka.get(l.id);
      return {
        user_id: l.id,
        jmeno: l.name,
        role: l.role,
        uvazek: l.uvazek,
        id: r?.id ?? null,
        hodiny: r?.hodiny ?? null,
        // Bez řádku se předvyplní sazba z profilu, ať se nepíše znovu.
        sazba: r?.sazba ?? l.sazba_hod ?? null,
        mesicni: r?.mesicni ?? l.mesicni_plat ?? null,
        premie: Number(r?.premie ?? 0),
        srazky: Number(r?.srazky ?? 0),
        zalohy: Number(r?.zalohy ?? 0),
        hrube: r?.hrube ?? null,
        ciste: r?.ciste ?? null,
        stav: r?.stav ?? "rozpracovano",
        poznamka: r?.poznamka ?? null,
      };
    });

  return NextResponse.json({ obdobi, radky: seznam });
}

/** Uložení řádku. */
export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me || !smi(me.role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const obdobi = String(b.obdobi ?? "");
  const uziv = String(b.user_id ?? "");
  if (!/^\d{4}-\d{2}-01$/.test(obdobi) || !uziv) {
    return NextResponse.json({ error: "Chybí období nebo člověk." }, { status: 400 });
  }

  const stav = ["rozpracovano", "ke_schvaleni", "schvaleno", "vyplaceno"].includes(String(b.stav))
    ? String(b.stav) : "rozpracovano";

  const db = serviceClient();
  const { error } = await db.from("vyplaty").upsert({
    obdobi,
    user_id: uziv,
    jmeno: (b.jmeno as string) ?? null,
    hodiny: cislo(b.hodiny),
    sazba: cislo(b.sazba),
    mesicni: cislo(b.mesicni),
    premie: cislo(b.premie) ?? 0,
    srazky: cislo(b.srazky) ?? 0,
    zalohy: cislo(b.zalohy) ?? 0,
    hrube: cislo(b.hrube),
    ciste: cislo(b.ciste),
    stav,
    poznamka: String(b.poznamka ?? "").trim() || null,
    // Datum výplaty se zapíše jen jednou, při přechodu do vyplaceno.
    vyplaceno_at: stav === "vyplaceno" ? new Date().toISOString() : null,
    upravil: me.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "obdobi,user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (stav === "vyplaceno") {
    await audit({
      action: "vyplata.paid", entity: "vyplaty", entityId: `${obdobi}:${uziv}`,
      actorId: me.id, source: "manual",
      reason: `Vyplaceno ${b.jmeno ?? uziv} za ${obdobi}`,
    });
  }

  return NextResponse.json({ ok: true });
}

/** Uložení výchozí sazby do profilu. Jen správce. */
export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  let b: { user_id?: string; sazba_hod?: unknown; mesicni_plat?: unknown };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }
  if (!b.user_id) return NextResponse.json({ error: "Chybí člověk." }, { status: 400 });

  const db = serviceClient();
  const { error } = await db.from("profiles").update({
    sazba_hod: cislo(b.sazba_hod),
    mesicni_plat: cislo(b.mesicni_plat),
  }).eq("id", b.user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

const cislo = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
