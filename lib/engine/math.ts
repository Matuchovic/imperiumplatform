/**
 * Jádro motoru. Žádné odhady — jen aritmetika nad kurzy.
 * Každá funkce je čistá, aby se dala otestovat bez sítě.
 */

/** Implikovaná pravděpodobnost z desetinného kurzu, včetně marže knihovny. */
export const impliedProb = (decimalOdds: number) => 1 / decimalOdds;

/** Součet implikovaných pravděpodobností. Nad 1 = marže knihovny. */
export const overround = (odds: number[]) =>
  odds.reduce((s, o) => s + impliedProb(o), 0);

/**
 * Odstranění marže dělením součtem.
 * Rychlé a průhledné, ale nadhodnocuje outsidery — u velkých kurzů
 * dává férovou pravděpodobnost vyšší, než ve skutečnosti je.
 * Pro dvoucestné trhy s vyrovnanými kurzy je to v pořádku.
 */
export function devigMultiplicative(odds: number[]): number[] {
  const sum = overround(odds);
  return odds.map((o) => impliedProb(o) / sum);
}

/**
 * Mocninná metoda: hledá k, pro které platí Σ (1/o_i)^k = 1.
 * Zkreslení u outsiderů je menší než u dělení součtem, proto je
 * tohle výchozí volba. Řeší se půlením intervalu, konverguje rychle.
 */
export function devigPower(odds: number[], iterations = 60): number[] {
  const raw = odds.map(impliedProb);
  let lo = 0.5;
  let hi = 2.5;

  for (let i = 0; i < iterations; i++) {
    const k = (lo + hi) / 2;
    const sum = raw.reduce((s, p) => s + Math.pow(p, k), 0);
    if (sum > 1) lo = k;
    else hi = k;
  }

  const k = (lo + hi) / 2;
  const powered = raw.map((p) => Math.pow(p, k));
  const total = powered.reduce((s, p) => s + p, 0);
  return powered.map((p) => p / total);
}

/**
 * Očekávaná hodnota na jednotku vsazené částky.
 * EV = p × kurz − 1. Kladné číslo znamená, že nabídka je štědřejší,
 * než odpovídá férové pravděpodobnosti.
 */
export const expectedValue = (fairProb: number, offeredOdds: number) =>
  fairProb * offeredOdds - 1;

/**
 * Kellyho podíl bankrollu. f = (p × d − 1) / (d − 1).
 * Plný Kelly je matematicky optimální na nekonečném horizontu,
 * ale jeho rozptyl je v praxi neúnosný — proto zlomek.
 */
export function kellyFraction(fairProb: number, offeredOdds: number): number {
  if (offeredOdds <= 1) return 0;
  const f = (fairProb * offeredOdds - 1) / (offeredOdds - 1);
  return Math.max(0, f);
}

/**
 * Převod Kellyho podílu na jednotky sázky.
 * Jednotka = unitPct % bankrollu, výsledek je oříznutý stropem.
 */
export function stakeInUnits(
  fairProb: number,
  offeredOdds: number,
  opts: { fraction: number; unitPct: number; maxUnits: number }
): number {
  const full = kellyFraction(fairProb, offeredOdds);
  const scaled = full * opts.fraction;
  const units = scaled / (opts.unitPct / 100);
  return Math.min(opts.maxUnits, Math.round(units * 10) / 10);
}

/**
 * Closing Line Value — o kolik byl náš kurz lepší než závěrečný.
 * Kladné CLV dlouhodobě znamená skutečnou výhodu. Pozná se z něj
 * dřív než ze zisku, protože ho neruší náhoda výsledků.
 */
export function clv(betOdds: number, closingOdds: number): number {
  return betOdds / closingOdds - 1;
}

/**
 * Nejnižší kurz, při kterém sázka ještě splní požadovanou hodnotu.
 * Nutné tam, kde cílová kancelář nemá API — manažer podle toho
 * pozná, jestli se u ní vyplatí sázet, aniž by kurz znal předem.
 */
export const thresholdOdds = (fairProb: number, minEv: number) =>
  (1 + minEv) / fairProb;
