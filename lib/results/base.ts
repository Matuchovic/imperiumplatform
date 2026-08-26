/**
 * Poskytovatel výsledků.
 *
 * Stejně jako u kurzů: kód konkrétní služby zůstane v adaptéru,
 * zúčtování pracuje s normalizovaným tvarem.
 *
 * Výsledek NIKDY neurčuje jazykový model. Je to fakt, ne odhad.
 */

export type MatchResult = {
  eventId: string;
  status: "finished" | "postponed" | "cancelled" | "in_progress" | "unknown";
  homeScore: number | null;
  awayScore: number | null;
  finishedAt: string | null;
};

export type SettlementOutcome = "won" | "lost" | "void" | "push" | "undecided";

export interface ResultsProvider {
  name: string;
  live: boolean;
  /** Výsledky pro dávku zápasů. Dávkově, ne po jednom. */
  getResults(eventIds: string[]): Promise<MatchResult[]>;
  healthCheck?(): Promise<boolean>;
}
