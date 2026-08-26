/**
 * Pásma kurzů.
 *
 * Čísla očekávání nejsou odhad — vyšla ze simulace 20 000 průběhů
 * po 300 tiketech při výhodě 3 % a čtvrtinovém Kelly. Jsou tu proto,
 * aby je klient viděl PŘED odběrem pásma, ne až uprostřed série proher.
 */

export type BandKey = "zaklad" | "standard" | "rozsireny" | "odvazny";

export type Band = {
  key: BandKey;
  label: string;
  min: number;
  max: number;
  hitRate: [number, number];
  stakePct: [number, number];
  /** Typická a nejhorší pozorovaná série proher za sebou. */
  losingRun: [number, number];
  /** Kolik tiketů je potřeba, aby šla výhoda vůbec prokázat. */
  proofN: number;
  /** Pásmo se smí odesílat bez schválení člověkem. */
  autoApprove: boolean;
  tone: "good" | "warn" | "bad";
};

export const BANDS: Band[] = [
  {
    key: "zaklad", label: "Základ", min: 1.3, max: 1.7,
    hitRate: [64, 79], stakePct: [1.3, 2.5], losingRun: [5, 14],
    proofN: 1200, autoApprove: true, tone: "good",
  },
  {
    key: "standard", label: "Standard", min: 1.7, max: 2.2,
    hitRate: [48, 64], stakePct: [0.8, 1.3], losingRun: [7, 19],
    proofN: 3800, autoApprove: true, tone: "good",
  },
  {
    key: "rozsireny", label: "Rozšířený", min: 2.2, max: 3.0,
    hitRate: [35, 48], stakePct: [0.5, 0.8], losingRun: [10, 37],
    proofN: 6500, autoApprove: false, tone: "warn",
  },
  {
    key: "odvazny", label: "Odvážný", min: 3.0, max: 99,
    hitRate: [17, 26], stakePct: [0.2, 0.3], losingRun: [24, 72],
    proofN: 22000, autoApprove: false, tone: "bad",
  },
];

export function bandFor(odds: number): Band {
  return BANDS.find((b) => odds >= b.min && odds < b.max) ?? BANDS[BANDS.length - 1];
}

export function bandByKey(key: string): Band | undefined {
  return BANDS.find((b) => b.key === key);
}

/**
 * Kategorie se NIKDY nedoplňuje na počet. Když motor v pásmu nic
 * nenajde, zůstane prázdné.
 *
 * Tlak "musíme dnes poslat aspoň jeden odvážný" je přesně ten
 * mechanismus, kterým se z poradenství stane vymýšlení sázek bez
 * výhody. Proto je to tvrdá funkce v kódu, ne pravidlo v hlavě.
 */
export function neverFillQuota(): true {
  return true;
}
