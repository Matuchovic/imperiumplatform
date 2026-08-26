import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { decideCandidate } from "@/lib/engine/approve";
import { dispatchCandidates } from "@/lib/engine/dispatch";
import { devigPower, expectedValue, stakeInUnits, thresholdOdds } from "@/lib/engine/math";
import { bandFor } from "@/lib/engine/bands";
import { addEntry } from "@/lib/bankroll/ledger";
import { keys } from "@/lib/bankroll/math";
import { newRunId, log } from "@/lib/log";
import type { Candidate } from "@/lib/engine/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vývojové naplnění systému.
 *
 * NEVYRÁBÍ falešná čísla do rozhraní. Vytvoří skutečný účet, pustí ho
 * skrz skutečnou matematiku, skutečné schválení a skutečné rozesílání —
 * takže výsledek v přehledu prošel stejným kódem jako produkční data.
 *
 * Slouží k ověření, že řetězec drží pohromadě, dokud nejsou napojení
 * skuteční poskytovatelé. Všechno, co vznikne, nese značku a dá se
 * jedním voláním smazat.
 */

const MARK = "[ukázka]";

const EVENTS = [
  { home: "Sparta", away: "Slavia", market: "1X2", sel: "1", sharp: [2.05, 3.40, 3.60], offered: 2.18 },
  { home: "Bayern", away: "Dortmund", market: "1X2", sel: "1", sharp: [1.62, 4.10, 5.20], offered: 1.71 },
  { home: "Arsenal", away: "Chelsea", market: "TOTALS", sel: "O 2.5", sharp: [1.88, 1.98], offered: 2.02 },
  { home: "Kometa", away: "Třinec", market: "TOTALS", sel: "O 5.5", sharp: [2.30, 1.62], offered: 2.48 },
];

export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  const url = new URL(req.url);
  if (url.searchParams.get("confirm") !== "ano") {
    return NextResponse.json(
      { error: "Chybí potvrzení. Přidej ?confirm=ano." },
      { status: 400 }
    );
  }

  const runId = newRunId();
  const db = serviceClient();

  try {
    // 1. Skutečný klientský účet přes Supabase Auth.
    const email = `ukazka+${Date.now().toString(36)}@betimperium.local`;
    const { data: created, error: authErr } = await db.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { name: `Ukázkový klient ${MARK}` },
    });
    if (authErr || !created.user) {
      return NextResponse.json({ error: `Účet nevznikl: ${authErr?.message}` }, { status: 500 });
    }

    const userId = created.user.id;
    await db.from("profiles").update({
      name: `Ukázkový klient ${MARK}`,
      role: "client",
      bankroll: 40000,
      unit_pct: 2,
      goal: 60000,
      subscribed_bands: ["zaklad", "standard", "rozsireny"],
    }).eq("id", userId);

    // Počáteční vklad do knihy — stejnou cestou jako u skutečného klienta.
    await addEntry({
      userId, kind: "deposit", amount: 40000,
      idempotencyKey: keys.deposit(userId, "seed"),
      note: `Počáteční vklad ${MARK}`,
    });

    // 2. Kandidáti přes skutečnou matematiku, ne vymyšlená čísla.
    const cands: Candidate[] = [];
    for (const [i, e] of EVENTS.entries()) {
      const fair = devigPower(e.sharp)[0];
      const ev = expectedValue(fair, e.offered);
      if (ev <= 0) continue;

      cands.push({
        id: crypto.randomUUID(),
        matchId: `seed-${i}`,
        sport: "seed",
        event: `${e.home} — ${e.away}`,
        market: e.market,
        selection: e.sel,
        sharpOdds: e.sharp[0],
        fairProb: fair,
        offeredOdds: e.offered,
        offeredBy: "ukázka",
        ev,
        thresholdOdds: thresholdOdds(fair, 0.02),
        units: stakeInUnits(fair, e.offered, { fraction: 0.25, unitPct: 2, maxUnits: 5 }),
        commenceTime: new Date(Date.now() + 3 * 3600_000).toISOString(),
      });
    }

    const { data: rows, error: cErr } = await db.from("candidates").insert(
      cands.map((c) => ({
        id: c.id, event_id: c.matchId, league: `seed ${MARK}`, event_name: c.event,
        market: c.market, selection: c.selection, sharp_odds: c.sharpOdds,
        fair_prob: c.fairProb, offered_odds: c.offeredOdds, offered_by: c.offeredBy,
        threshold_odds: c.thresholdOdds, ev: c.ev, units: c.units,
        commence_at: c.commenceTime, band: bandFor(c.offeredOdds).key, status: "pending",
      }))
    ).select("id");

    if (cErr) return NextResponse.json({ error: `Kandidáti: ${cErr.message}` }, { status: 500 });

    // 3. Schválení skutečnou službou — vzniknou i záznamy v approvals a auditu.
    let approved = 0;
    for (const r of rows ?? []) {
      const res = await decideCandidate(r.id as string, me.id, "approved", `Schváleno ${MARK}`);
      if (res.ok) approved++;
    }

    // 4. Rozeslání skutečným kódem: tikety i odečet vkladu z knihy.
    const dispatch = await dispatchCandidates(cands);

    log("info", "seed", "ukázková data vytvořena", { runId, approved, ...dispatch });

    return NextResponse.json({
      ok: true,
      note: "Data prošla skutečnou pipeline. Smazat lze přes DELETE na tuhle cestu.",
      client: { id: userId, email },
      candidates: cands.length,
      approved,
      tickets: dispatch.tickets,
      staked: dispatch.staked,
    });
  } catch (err) {
    log("error", "seed", "naplnění selhalo", {
      runId, error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Naplnění selhalo." }, { status: 500 });
  }
}

/** Smaže všechno, co seed vytvořil. Skutečná data se nedotknou. */
export async function DELETE() {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  const db = serviceClient();

  const { data: seeded } = await db
    .from("profiles").select("id").ilike("name", `%${MARK}%`);

  const ids = (seeded ?? []).map((p) => p.id as string);

  for (const id of ids) {
    await db.from("bankroll_entries").delete().eq("user_id", id);
    await db.from("tickets").delete().eq("user_id", id);
    await db.auth.admin.deleteUser(id);
  }

  await db.from("candidates").delete().ilike("league", `%${MARK}%`);

  return NextResponse.json({ ok: true, removed: ids.length });
}
