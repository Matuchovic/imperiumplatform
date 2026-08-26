import type { MatchResult, ResultsProvider } from "./base";

/**
 * Vývojový poskytovatel výsledků.
 *
 * Slouží k testům a k ověření řetězce, ne k provozu. `live: false`
 * je záměrné — zúčtování se podle toho pozná, že běží nasucho,
 * a nikde se neobjeví vymyšlený výsledek jako skutečný.
 */
export class MockResultsProvider implements ResultsProvider {
  name = "mock";
  live = false;

  constructor(private fixed: Map<string, MatchResult> = new Map()) {}

  set(result: MatchResult): void {
    this.fixed.set(result.eventId, result);
  }

  async getResults(eventIds: string[]): Promise<MatchResult[]> {
    return eventIds
      .map((id) => this.fixed.get(id))
      .filter((r): r is MatchResult => Boolean(r));
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
