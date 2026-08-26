import type { Consensus } from "./consensus";

/**
 * Market Pulse a Market Stress.
 *
 * Ani jedno není pravděpodobnost výhry. Pulse měří aktivitu trhu,
 * Stress technickou nestabilitu dat. Obojí je deterministický vzorec;
 * model může výsledek nanejvýš převyprávět.
 */

export type PulseInput = {
  /** Změna od publikace v procentech. */
  changePct: number;
  /** Rychlost v procentech za hodinu, null když chybí granularita. */
  velocityPctPerHour: number | null;
  consensus: Consensus;
  suspended: boolean;
};

export type StressInput = {
  consensus: Consensus;
  /** Kolikrát byl trh v okně pozastaven. */
  suspensions: number;
  /** Stáří posledního snapshotu v minutách. */
  dataAgeMinutes: number | null;
  divergencePct: number | null;
};

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

/**
 * Váhy: pohyb 40, rychlost 25, shoda kanceláří 25, pozastavení 10.
 *
 * Shoda má vysokou váhu schválně — když se osm z deseti kanceláří
 * hne stejným směrem, je to silnější informace než velikost pohybu
 * u jedné z nich.
 */
export function marketPulse(input: PulseInput): number {
  const magnitude = clamp((Math.abs(input.changePct) / 20) * 100) * 0.4;

  const velocity =
    input.velocityPctPerHour === null
      ? 0
      : clamp((Math.abs(input.velocityPctPerHour) / 25) * 100) * 0.25;

  const c = input.consensus;
  const moved = c.dropping + c.rising + c.stable;
  const sync =
    moved === 0 || c.agreement === "INSUFFICIENT_DATA"
      ? 0
      : clamp((Math.max(c.dropping, c.rising) / moved) * 100) * 0.25;

  const suspension = input.suspended ? 10 : 0;

  return Math.round(clamp(magnitude + velocity + sync + suspension));
}

export type StressBand = "CALM" | "NORMAL" | "ELEVATED" | "HIGH" | "EXTREME";

export function stressBand(score: number): StressBand {
  if (score <= 20) return "CALM";
  if (score <= 40) return "NORMAL";
  if (score <= 60) return "ELEVATED";
  if (score <= 80) return "HIGH";
  return "EXTREME";
}

/**
 * Stress měří, nakolik jsou data podezřelá — ne nakolik je zápas
 * nejistý. Vysoký stress znamená „těmhle číslům věř opatrně".
 */
export function marketStress(input: StressInput): number {
  const c = input.consensus;

  // Široké rozpětí mezi kancelářemi = trh se neshodne na ceně.
  const spread = c.spreadPct === null ? 0 : clamp((c.spreadPct / 15) * 100) * 0.3;

  // Pozastavení je nejsilnější signál technické nestability.
  const suspension = clamp(input.suspensions * 25) * 0.3;

  // Zastaralá data jsou nespolehlivá i bez pohybu.
  const stale =
    input.dataAgeMinutes === null
      ? 50 * 0.2
      : clamp((input.dataAgeMinutes / 120) * 100) * 0.2;

  const divergence =
    input.divergencePct === null ? 0 : clamp((Math.abs(input.divergencePct) / 15) * 100) * 0.2;

  return Math.round(clamp(spread + suspension + stale + divergence));
}
