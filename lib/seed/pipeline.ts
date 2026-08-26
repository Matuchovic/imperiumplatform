import { serviceClient } from "@/lib/supabase/server";
import { decideCandidate } from "@/lib/engine/approve";
import { dispatchCandidates } from "@/lib/engine/dispatch";
import { devigPower, expectedValue, stakeInUnits, thresholdOdds } from "@/lib/engine/math";
import { bandFor } from "@/lib/engine/bands";
import { addEntry } from "@/lib/bankroll/ledger";
import { keys } from "@/lib/bankroll/math";
import { newRunId, log } from "@/lib/log";
import { DEMO_TAG } from "./generate";
import type { Candidate } from "@/lib/engine/types";

/**
 * Průchod skutečnou pipeline.
 *
 * Na rozdíl od generátoru historie tady nejde o objem dat, ale o důkaz,
 * že řetězec drží pohromadě: účet přes Supabase Auth, kandidáti přes
 * skutečnou matematiku, schválení přes decideCandidate a rozeslání
 * přes dispatchCandidates. Nic se neobchází.
 */

const EVENTS = [
  { home: "Sparta", away: "Slavia", market: "1X2", sel: "1", sharp: [2.05, 3.40, 3.60], offered: 2.18 },
  { home: "Bayern", away: "Dortmund", market: "1X2", sel: "1", sharp: [1.62, 4.10, 5.20], offered: 1.71 },
  { home: "Arsenal", away: "Chelsea", market: "TOTALS", sel: "O 2.5", sharp: [1.88, 1.98], offered: 2.02 },
  { home: "Kometa", away: "Třinec", market: "TOTALS", sel: "O 5.5", sharp: [2.30, 1.62], offered: 2.48 },
];

export type PipelineSeedResult = {
  ok: boolean;
  error?: string;
  note?: string;
  client?: { id: string; email: string };
  candidates?: number;
  approved?: number;
  tickets?: number;
  staked?: number;
};

export async function runPipelineSeed(approverId: string): Promise<PipelineSeedResult> {
  const runId = newRunId();
  const db = serviceClient();

  try {
    // 1. Skutečný účet přes Supabase Auth, ne řádek vložený stranou.
    const email = `ukazka+${Date.now().toString(36)}@betimperium.local`;
    const { data: created, error: authErr } = await db.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { name: `Ukázkový klient ${DEMO_TAG}` },
    });

    if (authErr || !created.user) {
      return { ok: false, error: `Účet nevznikl: ${authErr?.message ?? "neznámá chyba"}` };
    }

    const userId = created.user.id;
    await db.from("profiles").update({
      name: `Ukázkový klient ${DEMO_TAG}`,
      role: "client",
      bankroll: 40000,
      unit_pct: 2,
      goal: 60000,
      subscribed_bands: ["zaklad", "standard", "rozsireny"],
      is_demo: true,
    }).eq("id", userId);

    // Počáteční vklad jde do knihy stejnou cestou jako u reálného klienta.
    await addEntry({
      userId, kind: "deposit", amount: 40000,
      idempotencyKey: keys.deposit(userId, "pipeline"),
      note: `Počáteční vklad ${DEMO_TAG}`,
    });

    // 2. Kandidáti přes skutečnou matematiku, ne vymyšlená čísla.
    const cands: Candidate[] = [];
    for (const [i, e] of EVENTS.entries()) {
      const fair = devigPower(e.sharp)[0];
      const ev = expectedValue(fair, e.offered);
      if (ev <= 0) continue;

      cands.push({
        id: crypto.randomUUID(),
        matchId: `pipeline-${i}`,
        sport: "ukázka",
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

    if (cands.length === 0) {
      return { ok: false, error: "Žádný z ukázkových zápasů nemá kladné EV." };
    }

    const { data: rows, error: cErr } = await db.from("candidates").insert(
      cands.map((c) => ({
        id: c.id, event_id: c.matchId, league: "ukázka", event_name: c.event,
        market: c.market, selection: c.selection, sharp_odds: c.sharpOdds,
        fair_prob: c.fairProb, offered_odds: c.offeredOdds, offered_by: c.offeredBy,
        threshold_odds: c.thresholdOdds, ev: c.ev, units: c.units,
        commence_at: c.commenceTime, band: bandFor(c.offeredOdds).key,
        status: "pending", is_demo: true,
      }))
    ).select("id");

    if (cErr) return { ok: false, error: `Kandidáti: ${cErr.message}` };

    // 3. Schválení skutečnou službou — vzniknou i záznamy v approvals a auditu.
    let approved = 0;
    for (const r of rows ?? []) {
      const res = await decideCandidate(r.id as string, approverId, "approved", `Schváleno ${DEMO_TAG}`);
      if (res.ok) approved++;
    }

    // 4. Rozeslání skutečným kódem: tikety i odečet vkladu z knihy.
    const dispatch = await dispatchCandidates(cands);

    log("info", "seed", "průchod pipeline dokončen", {
      runId, approved, tickets: dispatch.tickets, staked: dispatch.staked,
    });

    return {
      ok: true,
      note: "Data prošla skutečnou pipeline. Smazat lze přes DELETE /api/demo/seed.",
      client: { id: userId, email },
      candidates: cands.length,
      approved,
      tickets: dispatch.tickets,
      staked: dispatch.staked,
    };
  } catch (err) {
    log("error", "seed", "průchod pipeline selhal", {
      runId, error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "Průchod pipeline selhal." };
  }
}
