/**
 * Výkonnostní metriky. Čisté funkce nad skutečnými tikety.
 *
 * Zásada, která tenhle modul určuje: samotné ROI nebo úspěšnost nejsou
 * důkaz. Při malém vzorku je rozptyl větší než rozdíl mezi funkčním
 * a nefunkčním systémem, takže se ke každému číslu počítá i interval
 * a poctivá odpověď na otázku "víme to už?".
 */

export type SettledTicket = {
  stake: number;
  profit: number;
  odds: number;
  clv: number | null;
};

export type Performance = {
  count: number;
  won: number;
  lost: number;
  void: number;
  staked: number;
  profit: number;
  /** Zisk na vsazenou korunu, v procentech. */
  roi: number;
  winRate: number;
  avgOdds: number;
  /** Průměrné CLV — ustálí se dřív než zisk, proto je hlavní. */
  avgClv: number | null;
  clvCount: number;
  /** 95% interval kolem ROI. Null, když je vzorek moc malý. */
  roiInterval: [number, number] | null;
  /** Je zisk odlišitelný od náhody? */
  proven: boolean;
  /** Kolik tiketů by bylo potřeba při současné výkonnosti. */
  needForProof: number | null;
};

const round = (n: number, d = 2) => {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
};

export const MIN_SAMPLE_FOR_INTERVAL = 30;

export function performance(tickets: SettledTicket[]): Performance {
  const valid = tickets.filter((t) => isFinite(t.stake) && t.stake > 0);
  const n = valid.length;

  const empty: Performance = {
    count: 0, won: 0, lost: 0, void: 0, staked: 0, profit: 0,
    roi: 0, winRate: 0, avgOdds: 0, avgClv: null, clvCount: 0,
    roiInterval: null, proven: false, needForProof: null,
  };
  if (n === 0) return empty;

  const staked = valid.reduce((s, t) => s + t.stake, 0);
  const profit = valid.reduce((s, t) => s + t.profit, 0);

  const won = valid.filter((t) => t.profit > 0).length;
  const lost = valid.filter((t) => t.profit < 0).length;
  const voided = valid.filter((t) => t.profit === 0).length;

  const withClv = valid.filter((t) => t.clv !== null);

  // Výnos na jednotku vkladu u každého tiketu — z toho se počítá
  // rozptyl. Bez něj by interval nešel spočítat z dat, jen z modelu.
  const returns = valid.map((t) => t.profit / t.stake);
  const mean = returns.reduce((s, x) => s + x, 0) / n;

  let interval: [number, number] | null = null;
  let proven = false;
  let needForProof: number | null = null;

  if (n >= MIN_SAMPLE_FOR_INTERVAL) {
    const variance = returns.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);
    const se = Math.sqrt(variance / n);
    const lo = (mean - 1.96 * se) * 100;
    const hi = (mean + 1.96 * se) * 100;
    interval = [round(lo), round(hi)];
    proven = lo > 0;

    if (!proven && mean > 0) {
      // Kolik pozorování by interval odsunulo nad nulu.
      const sd = Math.sqrt(variance);
      needForProof = Math.ceil(Math.pow((1.96 * sd) / mean, 2));
    }
  }

  return {
    count: n,
    won, lost, void: voided,
    staked: round(staked),
    profit: round(profit),
    roi: round((profit / staked) * 100),
    winRate: round((won / n) * 100),
    avgOdds: round(valid.reduce((s, t) => s + t.odds, 0) / n, 3),
    avgClv: withClv.length
      ? round((withClv.reduce((s, t) => s + (t.clv ?? 0), 0) / withClv.length) * 100)
      : null,
    clvCount: withClv.length,
    roiInterval: interval,
    proven,
    needForProof,
  };
}

/**
 * Věta, kterou se výsledek smí popsat. Bez ní by si každý přečetl
 * kladné ROI jako důkaz, i když je vzorek dvacet tiketů.
 */
export function confidenceNote(p: Performance): string {
  if (p.count === 0) return "Zatím žádné vyhodnocené tikety.";
  if (p.count < MIN_SAMPLE_FOR_INTERVAL) {
    return `Jen ${p.count} tiketů — na jakýkoli závěr je příliš brzy.`;
  }
  if (p.proven) {
    return `Zisk je při ${p.count} tiketech odlišitelný od náhody.`;
  }
  if (p.needForProof) {
    return `Interval přesahuje nulu. Na průkaz by bylo potřeba kolem ${p.needForProof.toLocaleString("cs-CZ")} tiketů.`;
  }
  return "Interval přesahuje nulu, zisk zatím nejde odlišit od náhody.";
}

/** Zhodnocení bankrollu vůči cíli. */
export function goalProgress(balance: number, start: number, goal: number) {
  if (goal <= start) return { pct: 0, remaining: 0, reached: balance >= goal };
  const pct = Math.max(0, Math.min(100, ((balance - start) / (goal - start)) * 100));
  return { pct: round(pct, 1), remaining: round(Math.max(0, goal - balance)), reached: balance >= goal };
}
