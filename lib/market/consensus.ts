/**
 * Shoda a rozpor mezi kancelářemi.
 *
 * Systém nikdy netvrdí příčinu. Odlehlá nabídka může být zastaralá
 * cena, chyba dat nebo skutečná příležitost — rozlišit to z čísel
 * nejde, takže se jen oznámí, že rozpor nastal.
 */

export type BookQuote = { bookmaker: string; odds: number; previousOdds?: number | null };

export type Consensus = {
  count: number;
  median: number | null;
  average: number | null;
  best: number | null;
  worst: number | null;
  /** Rozpětí mezi nejlepší a nejhorší nabídkou v procentech. */
  spreadPct: number | null;
  dropping: number;
  rising: number;
  stable: number;
  agreement: "STRONG_DOWNWARD" | "STRONG_UPWARD" | "MIXED" | "INSUFFICIENT_DATA";
};

/** Pod pěti kancelářemi nemá medián ani shoda vypovídací hodnotu. */
export const MIN_BOOKS_FOR_CONSENSUS = 5;

export function median(values: number[]): number | null {
  const v = values.filter((x) => isFinite(x) && x > 1).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function consensus(quotes: BookQuote[]): Consensus {
  const valid = quotes.filter((q) => isFinite(q.odds) && q.odds > 1);
  const odds = valid.map((q) => q.odds);

  if (odds.length === 0) {
    return {
      count: 0, median: null, average: null, best: null, worst: null,
      spreadPct: null, dropping: 0, rising: 0, stable: 0,
      agreement: "INSUFFICIENT_DATA",
    };
  }

  const best = Math.max(...odds);
  const worst = Math.min(...odds);

  let dropping = 0, rising = 0, stable = 0;
  for (const q of valid) {
    if (q.previousOdds == null || !isFinite(q.previousOdds) || q.previousOdds <= 1) continue;
    const diff = ((q.odds - q.previousOdds) / q.previousOdds) * 100;
    if (diff <= -0.5) dropping++;
    else if (diff >= 0.5) rising++;
    else stable++;
  }

  const moved = dropping + rising + stable;
  let agreement: Consensus["agreement"] = "INSUFFICIENT_DATA";
  if (valid.length >= MIN_BOOKS_FOR_CONSENSUS && moved > 0) {
    if (dropping / moved >= 0.7) agreement = "STRONG_DOWNWARD";
    else if (rising / moved >= 0.7) agreement = "STRONG_UPWARD";
    else agreement = "MIXED";
  }

  return {
    count: valid.length,
    median: median(odds),
    average: odds.reduce((s, x) => s + x, 0) / odds.length,
    best,
    worst,
    spreadPct: ((best - worst) / worst) * 100,
    dropping, rising, stable,
    agreement,
  };
}

export type Divergence = {
  detected: boolean;
  bookmaker: string | null;
  odds: number | null;
  medianOdds: number | null;
  deviationPct: number | null;
};

/**
 * Nabídka výrazně mimo medián. Práh je v procentech odchylky,
 * ne v absolutním rozdílu — u kurzu 1.20 znamená 0.10 něco jiného
 * než u 6.00.
 */
export function findDivergence(quotes: BookQuote[], thresholdPct = 6): Divergence {
  const c = consensus(quotes);
  const none: Divergence = {
    detected: false, bookmaker: null, odds: null, medianOdds: c.median, deviationPct: null,
  };
  if (c.median === null || c.count < MIN_BOOKS_FOR_CONSENSUS) return none;

  let worstDev = 0;
  let found: BookQuote | null = null;
  for (const q of quotes) {
    if (!isFinite(q.odds) || q.odds <= 1) continue;
    const dev = ((q.odds - c.median) / c.median) * 100;
    if (Math.abs(dev) > Math.abs(worstDev)) {
      worstDev = dev;
      found = q;
    }
  }

  if (!found || Math.abs(worstDev) < thresholdPct) return none;
  return {
    detected: true,
    bookmaker: found.bookmaker,
    odds: found.odds,
    medianOdds: c.median,
    deviationPct: worstDev,
  };
}
