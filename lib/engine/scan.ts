import { devigPower, expectedValue, stakeInUnits, thresholdOdds } from "./math";
import { DEFAULT_CONFIG, type Candidate, type EngineConfig, type MatchOdds } from "./types";
import { getProvider } from "@/lib/providers/odds";

/** Identifikátory lig se liší podle poskytovatele — ověř přes /api/engine/probe. */
const SPORTS = (process.env.ENGINE_LEAGUES ?? "EPL,NBA,NHL").split(",").map((s) => s.trim());

export type ScanResult = {
  provider: string;
  live: boolean;
  scannedMatches: number;
  scannedBooks: number;
  candidates: Candidate[];
  scannedAt: string;
  /** Ligy, které dnes mají zápasy s kurzy. */
  leaguesAvailable: string[];
  /** Ligy prohledané v tomhle běhu — kvůli kvótě jen část. */
  leaguesScanned: string[];
};

/**
 * Kolik lig se projde v jednom běhu.
 *
 * Prohledat všechny sporty každých 15 minut znamená 46× překročit
 * měsíční kvótu free tieru — motor by umlkl během prvního dne.
 * Místo omezení výběru se ligy střídají: každý běh vezme další díl,
 * takže se za pár hodin projdou všechny.
 */
const LEAGUES_PER_RUN = Number(process.env.ENGINE_LEAGUES_PER_RUN ?? 6);

/**
 * Jeden průchod: kurzy → odstranění marže z ostré knihovny →
 * porovnání s ostatními → kandidáti. Nic se neodesílá,
 * odeslání je vždycky až po schválení člověkem.
 */
export async function scanForValue(config: EngineConfig = DEFAULT_CONFIG): Promise<ScanResult> {
  const provider = getProvider();
  let matches: MatchOdds[] = [];
  let available: string[] = [];
  let scanned: string[] = [];

  try {
    // Nejdřív zjistit, co se dnes vůbec hraje. Pevný seznam lig je past:
    // v srpnu má NBA i NHL mimosezónu a dvě třetiny dotazů vrátí prázdno.
    if (provider.discoverToday) {
      const found = await provider.discoverToday();
      available = found.leagues;
    }

    // Když objevování není k dispozici, padá se na seznam z prostředí.
    if (available.length === 0) available = SPORTS;

    // Střídání podle času — bez ukládání stavu. Každý běh posune okno
    // o kus dál, takže se na nízkoobjemové ligy taky dostane.
    if (available.length > LEAGUES_PER_RUN) {
      const slices = Math.ceil(available.length / LEAGUES_PER_RUN);
      const slice = Math.floor(Date.now() / (15 * 60 * 1000)) % slices;
      const start = slice * LEAGUES_PER_RUN;
      scanned = available.slice(start, start + LEAGUES_PER_RUN);
      if (scanned.length === 0) scanned = available.slice(0, LEAGUES_PER_RUN);
    } else {
      scanned = available;
    }

    matches = await provider.fetchOdds(scanned);
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
          thresholdOdds: thresholdOdds(fairProb, config.minEv),
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
    leaguesAvailable: available,
    leaguesScanned: scanned,
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
