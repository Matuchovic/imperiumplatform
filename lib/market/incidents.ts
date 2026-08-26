import type { MarketSignal, Severity } from "./signals";
import { severityRank } from "./dedupe";

/**
 * Incident = kombinace závažných signálů na jednom trhu v krátkém okně.
 *
 * Tohle je zároveň brána pro volání modelu: snapshot ani jednotlivý
 * signál model nevolá, incident ano. Bez toho by tisíc snapshotů
 * znamenalo tisíc volání.
 */

export type Incident = {
  key: string;
  eventId: string;
  marketId: string;
  severity: Severity;
  signals: MarketSignal[];
  startedAt: string;
  /** Důvod vzniku — vysvětlitelný bez modelu. */
  trigger: string;
};

/** Signály, které samy o sobě stačí na incident. */
const STANDALONE: ReadonlySet<string> = new Set([
  "EXTREME_MOVE",
  "MARKET_ANOMALY",
]);

export const INCIDENT_WINDOW_MINUTES = 15;
export const MIN_SIGNALS_FOR_INCIDENT = 3;

export function detectIncident(
  signals: MarketSignal[],
  now: Date = new Date()
): Incident | null {
  if (signals.length === 0) return null;

  const cutoff = now.getTime() - INCIDENT_WINDOW_MINUTES * 60000;
  const recent = signals.filter((s) => new Date(s.detectedAt).getTime() >= cutoff);
  if (recent.length === 0) return null;

  const first = recent[0];
  const standalone = recent.find((s) => STANDALONE.has(s.type));
  const serious = recent.filter((s) => severityRank(s.severity) >= severityRank("high"));

  let trigger: string | null = null;
  if (standalone) trigger = `Samostatně závažný signál: ${standalone.type}`;
  else if (serious.length >= 2) trigger = `${serious.length} závažné signály v okně ${INCIDENT_WINDOW_MINUTES} minut`;
  else if (recent.length >= MIN_SIGNALS_FOR_INCIDENT) trigger = `${recent.length} signálů v okně ${INCIDENT_WINDOW_MINUTES} minut`;

  if (!trigger) return null;

  const worst = recent.reduce<Severity>(
    (acc, s) => (severityRank(s.severity) > severityRank(acc) ? s.severity : acc),
    "info"
  );

  return {
    key: `${first.eventId}:${first.marketId}:${Math.floor(cutoff / 60000)}`,
    eventId: first.eventId,
    marketId: first.marketId,
    severity: worst,
    signals: recent,
    startedAt: recent[0].detectedAt,
    trigger,
  };
}
