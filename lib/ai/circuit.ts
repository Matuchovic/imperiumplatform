import { log } from "@/lib/log";

/**
 * Pojistka proti výpadku jazykového modelu.
 *
 * Nejdůležitější pravidlo celé AI vrstvy: když model nefunguje,
 * deterministický výpočet běží dál. Ztratí se jen slovní shrnutí.
 */

export type CircuitState = "closed" | "open" | "half_open";

export const FAILURE_THRESHOLD = 3;
export const OPEN_MS = 5 * 60 * 1000;

let failures = 0;
let openedAt = 0;

export function circuitState(now: number = Date.now()): CircuitState {
  if (failures < FAILURE_THRESHOLD) return "closed";
  if (now - openedAt >= OPEN_MS) return "half_open";
  return "open";
}

export function recordSuccess(): void {
  failures = 0;
  openedAt = 0;
}

export function recordFailure(now: number = Date.now()): void {
  failures++;
  if (failures === FAILURE_THRESHOLD) {
    openedAt = now;
    log("warn", "ai", "circuit breaker otevřen — přechod do degradovaného režimu", {
      failures,
      reopenAfterMs: OPEN_MS,
    });
  }
}

export function resetCircuit(): void {
  failures = 0;
  openedAt = 0;
}

/**
 * Spustí volání modelu jedině, když je obvod zavřený.
 * Při výpadku vrátí null — volající musí umět pokračovat bez modelu.
 */
export async function throughCircuit<T>(fn: () => Promise<T | null>): Promise<T | null> {
  if (circuitState() === "open") return null;

  try {
    const result = await fn();
    if (result === null) {
      recordFailure();
      return null;
    }
    recordSuccess();
    return result;
  } catch (err) {
    recordFailure();
    log("error", "ai", "volání modelu selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
