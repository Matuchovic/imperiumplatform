/**
 * Strukturované logování. Jeden tvar záznamu pro celý systém, aby
 * šlo běhy dohledat podle run_id napříč vrstvami.
 *
 * Tajemství se nelogují nikdy — hodnoty se před výstupem filtrují.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const SECRET_KEYS = /key|secret|token|password|authorization|apikey/i;

function scrub(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(scrub);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEYS.test(k) ? "[skryto]" : scrub(v);
  }
  return out;
}

export function newRunId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function log(
  level: LogLevel,
  scope: string,
  message: string,
  fields: Record<string, unknown> = {}
): void {
  const record = {
    at: new Date().toISOString(),
    level,
    scope,
    message,
    ...(scrub(fields) as Record<string, unknown>),
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Měří dobu běhu a zaloguje výsledek i při chybě. */
export async function timed<T>(
  scope: string,
  message: string,
  fn: (runId: string) => Promise<T>,
  fields: Record<string, unknown> = {}
): Promise<T> {
  const runId = newRunId();
  const started = Date.now();
  try {
    const result = await fn(runId);
    log("info", scope, message, { ...fields, runId, ms: Date.now() - started, ok: true });
    return result;
  } catch (err) {
    log("error", scope, message, {
      ...fields,
      runId,
      ms: Date.now() - started,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
