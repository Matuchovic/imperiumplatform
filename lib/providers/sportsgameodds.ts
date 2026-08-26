import type { OddsProvider } from "./base";
import type { MatchOdds, BookmakerMarket } from "@/lib/engine/types";

const BASE = "https://api.sportsgameodds.com/v2";

/**
 * SportsGameOdds. Klíč: https://sportsgameodds.com
 *
 * POZOR: mapování níž je napsané podle dokumentace, ne podle ověřené
 * odpovědi. Než se na to spolehneš, projeď /api/engine/probe — vrátí
 * syrový JSON a uvidíš skutečné názvy polí. Když nesedí, opraví se
 * jen tahle funkce, motor zůstane beze změny.
 */
export class SportsGameOddsProvider implements OddsProvider {
  name = "sportsgameodds";
  live = true;

  constructor(private apiKey: string) {}

  private async get(path: string, params: Record<string, string>) {
    const url = `${BASE}${path}?${new URLSearchParams(params)}`;
    const res = await fetch(url, {
      headers: { "X-Api-Key": this.apiKey },
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json();
  }

  async probe(sport: string) {
    return this.get("/events", { leagueID: sport, oddsAvailable: "true", limit: "1" });
  }

  async fetchOdds(leagues: string[]): Promise<MatchOdds[]> {
    const out: MatchOdds[] = [];

    for (const league of leagues) {
      let raw: any;
      try {
        raw = await this.get("/events", {
          leagueID: league,
          oddsAvailable: "true",
          limit: "25",
        });
      } catch (err) {
        console.error(`[sgo] ${league}:`, err);
        continue;
      }

      const events: any[] = raw?.data ?? raw?.events ?? [];

      for (const e of events) {
        const books = new Map<string, BookmakerMarket>();

        // Odds bývají klíčované jako objekt oddID -> záznam.
        const oddsEntries: any[] = Array.isArray(e?.odds)
          ? e.odds
          : Object.values(e?.odds ?? {});

        for (const odd of oddsEntries) {
          // Zajímá nás jen zápasový vítěz, ne handicapy a totaly.
          if (odd?.betTypeID && odd.betTypeID !== "ml") continue;

          const byBook: Record<string, any> = odd?.byBookmaker ?? {};
          for (const [bookKey, quote] of Object.entries(byBook)) {
            const price = Number((quote as any)?.odds ?? (quote as any)?.decimalOdds);
            if (!price || price <= 1) continue;

            const name = odd?.sideID ?? odd?.playerID ?? "?";
            const existing = books.get(bookKey);
            if (existing) {
              existing.outcomes.push({ name, price });
            } else {
              books.set(bookKey, {
                bookmaker: bookKey,
                market: "h2h",
                lastUpdate: new Date().toISOString(),
                outcomes: [{ name, price }],
              });
            }
          }
        }

        const list = [...books.values()].filter((b) => b.outcomes.length >= 2);
        if (list.length === 0) continue;

        out.push({
          id: String(e?.eventID ?? e?.id),
          sport: league,
          commenceTime: e?.status?.startsAt ?? e?.startsAt ?? new Date().toISOString(),
          home: e?.teams?.home?.names?.short ?? e?.homeTeam ?? "Domácí",
          away: e?.teams?.away?.names?.short ?? e?.awayTeam ?? "Hosté",
          books: list,
        });
      }
    }

    return out;
  }
}
