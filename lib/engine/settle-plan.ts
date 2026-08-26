import { settleBet } from "@/lib/results/settle";
import { payoutFor, profitFor, keys, type BetState } from "@/lib/bankroll/math";
import type { MatchResult } from "@/lib/results/base";

/**
 * Plán zúčtování. Čistá funkce: tikety + výsledky → co se má stát.
 *
 * Oddělené od provedení schválně. Plán jde spočítat, vypsat a nechat
 * si zkontrolovat, aniž by se cokoli zapsalo — a jde ho otestovat
 * bez databáze.
 */

export type OpenTicket = {
  id: string;
  userId: string;
  eventId: string;
  market: string;
  selection: string;
  odds: number;
  stake: number;
  state: string;
};

export type SettlementItem = {
  ticketId: string;
  userId: string;
  state: BetState;
  payout: number;
  profit: number;
  ledgerKey: string;
};

export type SettlementPlan = {
  settle: SettlementItem[];
  /** Zápasy bez definitivního výsledku zůstávají otevřené. */
  undecided: string[];
  /** Tikety, které už zúčtované jsou. */
  alreadySettled: string[];
  missingResult: string[];
  totalPayout: number;
};

export function buildPlan(tickets: OpenTicket[], results: MatchResult[]): SettlementPlan {
  const byEvent = new Map(results.map((r) => [r.eventId, r]));

  const settle: SettlementItem[] = [];
  const undecided: string[] = [];
  const alreadySettled: string[] = [];
  const missingResult: string[] = [];

  for (const t of tickets) {
    // Už zúčtovaný tiket se nikdy nepřepočítává. Oprava se dělá
    // protizápisem, ne přepsáním.
    if (t.state !== "open") {
      alreadySettled.push(t.id);
      continue;
    }

    const result = byEvent.get(t.eventId);
    if (!result) {
      missingResult.push(t.id);
      continue;
    }

    const outcome = settleBet({ market: t.market, selection: t.selection }, result);
    if (outcome === "undecided") {
      undecided.push(t.id);
      continue;
    }

    settle.push({
      ticketId: t.id,
      userId: t.userId,
      state: outcome,
      payout: payoutFor(outcome, t.stake, t.odds),
      profit: profitFor(outcome, t.stake, t.odds),
      ledgerKey: keys.payout(t.id),
    });
  }

  return {
    settle,
    undecided,
    alreadySettled,
    missingResult,
    totalPayout: Math.round(settle.reduce((s, x) => s + x.payout, 0) * 100) / 100,
  };
}
