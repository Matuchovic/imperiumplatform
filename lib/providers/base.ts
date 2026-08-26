import type { MatchOdds } from "@/lib/engine/types";

export interface OddsProvider {
  name: string;
  live: boolean;
  fetchOdds(sports: string[]): Promise<MatchOdds[]>;
  /** Syrová odpověď pro ověření tvaru dat. Bez toho se ladí naslepo. */
  probe?(sport: string): Promise<unknown>;
  /**
   * Kurz těsně před výkopem — podklad pro CLV.
   * Volitelné: ne každý poskytovatel ho umí a bez CLV motor běží dál.
   */
  closingOdds?(
    eventId: string,
    market: string,
    selection: string
  ): Promise<number | null>;
  /**
   * Ligy, které dnes mají zápasy s kurzy. Bez toho by se skenoval
   * pevný seznam včetně těch, co mají mimosezónu.
   */
  discoverToday?(): Promise<{ leagues: string[]; counts: Record<string, number> }>;
}
