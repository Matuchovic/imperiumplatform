import { devigPower, expectedValue, stakeInUnits } from "./math";
import { DEFAULT_CONFIG, type Candidate, type EngineConfig, type MatchOdds } from "./types";
import { getProvider } from "@/lib/providers/odds";

const SPORTS = ["soccer_epl", "basketball_nba", "tennis_atp", "icehockey_nhl"];

export type ScanResult = {
  provider: string;
  live: boolean;
  scannedMatches: number;
  scannedBooks: number;
  candidates: Candidate[];
  scannedAt: string;
};

/**
 * Jeden průchod: kurzy → odstranění marže z ostré knihovny →
 * porovnání s ostatními → kandidáti. Nic se neodesílá,
 * odeslání je vždycky až po schválení člověkem.
 */
export async function scanForValue(config: EngineConfig = DEFAULT_CONFIG): Promise<ScanResult> {
  const provider = getProvider();
  let matches: MatchOdds[] = [];

  try {
    matches = await provider.fetchOdds(SPORTS);
  } catch (err) {
    console.error("[scan] zdroj kurzů selhal:", err);
  }

  const candidates: Candidate[] = [];
  let bookCount = 0;

  for (const match of matches) {
    bookCount += match.books.length;

    const sharp = match.books.find(
      (b) => b.bookmaker === config.sharpBook && b.market === "h2h"
    );
    // Bez ostré knihovny nemáme s čím porovnávat — zápas přeskočíme.
    if (!sharp || sharp.outcomes.length < 2) continue;

    const fair = devigPower(sharp.outcomes.map((o) => o.price));

    for (const book of match.books) {
      if (book.bookmaker === config.sharpBook || book.market !== "h2h") continue;

      for (const outcome of book.outcomes) {
        const idx = sharp.outcomes.findIndex((o) => o.name === outcome.name);
        if (idx === -1) continue;

        const fairProb = fair[idx];
        const ev = expectedValue(fairProb, outcome.price);

        if (ev < config.minEv) continue;
        if (outcome.price < config.minOdds || outcome.price > config.maxOdds) continue;

        candidates.push({
          id: `${match.id}-${book.bookmaker}-${outcome.name}`,
          matchId: match.id,
          sport: match.sport,
          event: `${match.home} – ${match.away}`,
          market: "Vítěz",
          selection: outcome.name,
          sharpOdds: sharp.outcomes[idx].price,
          fairProb,
          offeredOdds: outcome.price,
          offeredBy: book.bookmaker,
          ev,
          units: stakeInUnits(fairProb, outcome.price, {
            fraction: config.kellyFraction,
            unitPct: config.unitPct,
            maxUnits: config.maxUnits,
          }),
          commenceTime: match.commenceTime,
        });
      }
    }
  }

  candidates.sort((a, b) => b.ev - a.ev);

  return {
    provider: provider.name,
    live: provider.live,
    scannedMatches: matches.length,
    scannedBooks: bookCount,
    candidates: blockCorrelated(candidates),
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Na jeden zápas pouštíme jedinou sázku. Dvě sázky na tentýž zápas
 * jsou provázané a skutečná expozice je pak vyšší, než se zdá.
 * Blokace je tvrdá, ne varování — varování se proklikne.
 */
function blockCorrelated(list: Candidate[]): Candidate[] {
  const used = new Set<string>();
  return list.map((c) => {
    if (used.has(c.matchId)) {
      return { ...c, blocked: "Korelace — na zápas už je kandidát" };
    }
    used.add(c.matchId);
    return c;
  });
}
