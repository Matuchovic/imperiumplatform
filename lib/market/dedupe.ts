import type { MarketSignal, Severity } from "./signals";

/**
 * Deduplikace signálů.
 *
 * Bez ní vyrobí pohyb 2.02 → 2.01 → 2.00 tři upozornění na totéž.
 * Nový alert vznikne jedině tehdy, když uplynul cooldown nebo když
 * závažnost vzrostla.
 */

const ORDER: Severity[] = ["info", "low", "medium", "high", "critical"];

export const severityRank = (s: Severity) => ORDER.indexOf(s);

/** Cooldown podle závažnosti — kritické se smí opakovat dřív. */
export const COOLDOWN_MINUTES: Record<Severity, number> = {
  info: 60,
  low: 30,
  medium: 15,
  high: 10,
  critical: 5,
};

export function dedupeKey(s: Pick<MarketSignal, "type" | "eventId" | "marketId" | "selectionId">): string {
  return `${s.eventId}:${s.marketId}:${s.selectionId}:${s.type}`;
}

export type PriorAlert = { severity: Severity; createdAt: string } | null;

export type DedupeDecision =
  | { emit: true; reason: "first" | "cooldown_elapsed" | "escalation" }
  | { emit: false; reason: "cooldown_active" };

export function shouldEmit(
  signal: MarketSignal,
  prior: PriorAlert,
  now: Date = new Date()
): DedupeDecision {
  if (!prior) return { emit: true, reason: "first" };

  // Eskalace projde vždycky. Když se ze středního pohybu stane
  // kritický, mlčet kvůli cooldownu by bylo horší než opakovat se.
  if (severityRank(signal.severity) > severityRank(prior.severity)) {
    return { emit: true, reason: "escalation" };
  }

  const elapsedMin = (now.getTime() - new Date(prior.createdAt).getTime()) / 60000;
  if (elapsedMin >= COOLDOWN_MINUTES[signal.severity]) {
    return { emit: true, reason: "cooldown_elapsed" };
  }

  return { emit: false, reason: "cooldown_active" };
}
