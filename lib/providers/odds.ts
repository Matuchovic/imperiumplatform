import type { MatchOdds } from "@/lib/engine/types";

/**
 * Zdroj kurzů. Adaptér se dá vyměnit, aniž by se sáhlo na motor.
 * Bez API klíče se použije mock — matematika běží stejná,
 * jen data nejsou živá.
 */
export interface OddsProvider {
  name: string;
  live: boolean;
  fetchOdds(sports: string[]): Promise<MatchOdds[]>;
}

type ApiOutcome = { name: string; price: number };
type ApiMarket = { key: string; outcomes: ApiOutcome[] };
type ApiBookmaker = { key: string; title: string; last_update: string; markets: ApiMarket[] };
type ApiEvent = {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: ApiBookmaker[];
};

/** Adaptér pro the-odds-api.com. Region eu, protože tam je Pinnacle. */
export class TheOddsApiProvider implements OddsProvider {
  name = "the-odds-api";
  live = true;

  constructor(private apiKey: string) {}

  async fetchOdds(sports: string[]): Promise<MatchOdds[]> {
    const out: MatchOdds[] = [];

    for (const sport of sports) {
      const url =
        `https://api.the-odds-api.com/v4/sports/${sport}/odds/` +
        `?apiKey=${encodeURIComponent(this.apiKey)}` +
        `&regions=eu&markets=h2h&oddsFormat=decimal`;

      const res = await fetch(url, { next: { revalidate: 60 } });

      if (!res.ok) {
        // Kvóta a neplatný klíč jsou nejčastější příčiny — ať je to v logu vidět.
        console.error(`[odds] ${sport}: ${res.status} ${await res.text()}`);
        continue;
      }

      const events = (await res.json()) as ApiEvent[];

      for (const e of events) {
        out.push({
          id: e.id,
          sport: e.sport_key,
          commenceTime: e.commence_time,
          home: e.home_team,
          away: e.away_team,
          books: e.bookmakers.flatMap((b) =>
            b.markets.map((m) => ({
              bookmaker: b.key,
              market: m.key,
              lastUpdate: b.last_update,
              outcomes: m.outcomes.map((o) => ({ name: o.name, price: o.price })),
            }))
          ),
        });
      }
    }

    return out;
  }
}

/** Náhrada bez klíče. Čísla jsou vymyšlená, výpočet nad nimi skutečný. */
export class MockProvider implements OddsProvider {
  name = "mock";
  live = false;

  async fetchOdds(): Promise<MatchOdds[]> {
    const soon = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

    return [
      {
        id: "m1",
        sport: "tennis_atp",
        commenceTime: soon(3),
        home: "Djoković",
        away: "Alcaraz",
        books: [
          { bookmaker: "pinnacle", market: "h2h", lastUpdate: soon(0), outcomes: [{ name: "Djoković", price: 2.10 }, { name: "Alcaraz", price: 1.80 }] },
          { bookmaker: "fortuna", market: "h2h", lastUpdate: soon(0), outcomes: [{ name: "Djoković", price: 2.42 }, { name: "Alcaraz", price: 1.68 }] },
        ],
      },
      {
        id: "m2",
        sport: "soccer_czech_liga",
        commenceTime: soon(6),
        home: "Sparta",
        away: "Slavia",
        books: [
          { bookmaker: "pinnacle", market: "h2h", lastUpdate: soon(0), outcomes: [{ name: "Sparta", price: 2.35 }, { name: "Slavia", price: 3.10 }, { name: "Draw", price: 3.40 }] },
          { bookmaker: "tipsport", market: "h2h", lastUpdate: soon(0), outcomes: [{ name: "Sparta", price: 2.55 }, { name: "Slavia", price: 3.00 }, { name: "Draw", price: 3.30 }] },
        ],
      },
      {
        id: "m3",
        sport: "basketball_nba",
        commenceTime: soon(12),
        home: "Lakers",
        away: "Celtics",
        books: [
          { bookmaker: "pinnacle", market: "h2h", lastUpdate: soon(0), outcomes: [{ name: "Lakers", price: 2.05 }, { name: "Celtics", price: 1.83 }] },
          { bookmaker: "betano", market: "h2h", lastUpdate: soon(0), outcomes: [{ name: "Lakers", price: 2.08 }, { name: "Celtics", price: 1.80 }] },
        ],
      },
    ];
  }
}

export function getProvider(): OddsProvider {
  const key = process.env.ODDS_API_KEY;
  return key ? new TheOddsApiProvider(key) : new MockProvider();
}
