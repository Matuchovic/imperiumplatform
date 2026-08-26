import type { MatchOdds } from "@/lib/engine/types";

export interface OddsProvider {
  name: string;
  live: boolean;
  fetchOdds(sports: string[]): Promise<MatchOdds[]>;
  /** Syrová odpověď pro ověření tvaru dat. Bez toho se ladí naslepo. */
  probe?(sport: string): Promise<unknown>;
}
