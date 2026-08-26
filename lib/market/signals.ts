/**
 * Signály trhu — deterministická klasifikace pohybu kurzu.
 *
 * Model se tady nepoužívá. Všechno jsou čisté funkce nad čísly,
 * takže je lze otestovat bez jediného skutečného snapshotu.
 */

export type SignalType =
  | "ODDS_UPDATED"
  | "ODDS_DROPPING"
  | "ODDS_RISING"
  | "RAPID_MOVE"
  | "MAJOR_MOVE"
  | "EXTREME_MOVE"
  | "MARKET_SUSPENDED"
  | "MARKET_RESTORED"
  | "CONSENSUS_SHIFT"
  | "BOOKMAKER_DIVERGENCE"
  | "VOLATILITY_SPIKE"
  | "VALUE_WEAKENING"
  | "VALUE_LOST"
  | "THRESHOLD_APPROACHING"
  | "MARKET_ANOMALY";

export type Severity = "info" | "low" | "medium" | "high" | "critical";
export type MovementClass = "STABLE" | "SMALL_MOVE" | "SIGNIFICANT_MOVE" | "MAJOR_MOVE" | "EXTREME_MOVE";
export type Direction = "ODDS_DROPPING" | "ODDS_RISING" | "STABLE";
export type ValueStatus = "STRONG_VALUE" | "VALUE_OK" | "VALUE_WEAKENING" | "VALUE_LOST" | "MARKET_UNAVAILABLE";

export type MarketSignal = {
  type: SignalType;
  eventId: string;
  marketId: string;
  selectionId: string;
  detectedAt: string;
  severity: Severity;
  source: string;
  metrics: Record<string, number | string | boolean | null>;
};

/**
 * Prahy na jednom místě. Rozeseté konstanty se rozejdou —
 * někdo změní jednu a na druhou zapomene.
 */
export type Thresholds = {
  small: number;
  significant: number;
  major: number;
  extreme: number;
  /** Kolik procent za hodinu se považuje za rychlý pohyb. */
  rapidPctPerHour: number;
  /** Jak blízko k minimu už je varování, v procentech. */
  thresholdProximityPct: number;
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  small: 2,
  significant: 5,
  major: 10,
  extreme: 20,
  rapidPctPerHour: 12,
  thresholdProximityPct: 2,
};

/** Procentní změna. Kladná = kurz stoupl. */
export function pctChange(from: number, to: number): number {
  if (!isFinite(from) || from <= 0) return 0;
  return ((to - from) / from) * 100;
}

export function classifyMovement(pct: number, t: Thresholds = DEFAULT_THRESHOLDS): MovementClass {
  const a = Math.abs(pct);
  if (a >= t.extreme) return "EXTREME_MOVE";
  if (a >= t.major) return "MAJOR_MOVE";
  if (a >= t.significant) return "SIGNIFICANT_MOVE";
  if (a >= t.small) return "SMALL_MOVE";
  return "STABLE";
}

export function direction(pct: number, t: Thresholds = DEFAULT_THRESHOLDS): Direction {
  if (Math.abs(pct) < t.small) return "STABLE";
  return pct < 0 ? "ODDS_DROPPING" : "ODDS_RISING";
}

export function severityFor(pct: number, t: Thresholds = DEFAULT_THRESHOLDS): Severity {
  const a = Math.abs(pct);
  if (a >= t.extreme) return "critical";
  if (a >= t.major) return "high";
  if (a >= t.significant) return "medium";
  if (a >= t.small) return "low";
  return "info";
}

/**
 * Stav hodnoty vůči minimálnímu přijatelnému kurzu.
 *
 * Kurz přesně na minimu je ještě v pořádku — minimum je hranice
 * přijatelnosti, ne bod ztráty.
 */
export function valueStatus(
  current: number | null,
  minimum: number,
  published: number,
  t: Thresholds = DEFAULT_THRESHOLDS
): ValueStatus {
  if (current === null || !isFinite(current) || current <= 1) return "MARKET_UNAVAILABLE";
  if (current < minimum) return "VALUE_LOST";

  const headroom = ((current - minimum) / minimum) * 100;
  if (headroom <= t.thresholdProximityPct) return "VALUE_WEAKENING";
  if (current >= published) return "STRONG_VALUE";
  return "VALUE_OK";
}

/**
 * Rychlost pohybu v procentech za hodinu.
 *
 * Pokles o 10 % za čtyři minuty a týž pokles za šest hodin jsou
 * dvě různé události.
 */
export function velocityPctPerHour(pct: number, minutesElapsed: number): number | null {
  if (!isFinite(minutesElapsed) || minutesElapsed <= 0) return null;
  return (pct / minutesElapsed) * 60;
}

export function isRapid(
  pct: number,
  minutesElapsed: number,
  t: Thresholds = DEFAULT_THRESHOLDS
): boolean {
  const v = velocityPctPerHour(pct, minutesElapsed);
  if (v === null) return false;
  return Math.abs(v) >= t.rapidPctPerHour;
}
