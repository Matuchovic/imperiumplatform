import { serviceClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { eventKey, isStableKey, type EventType } from "./keys";

/**
 * Sběrnice doménových událostí.
 *
 * Tabulka místo fronty — na Vercelu a Supabase je to přiměřené
 * a idempotenci zajistí unique index na klíč. Kafka by tady byla
 * architektura kvůli architektuře.
 */

export type EmitResult = { emitted: boolean; reason?: string };

export async function emit(
  type: EventType,
  entity: string,
  entityId: string,
  payload: Record<string, unknown> = {},
  discriminator?: string
): Promise<EmitResult> {
  const key = eventKey(type, entityId, discriminator);

  if (!isStableKey(key)) {
    log("warn", "events", "klíč obsahuje čas nebo náhodu — idempotence by neplatila", { key });
    return { emitted: false, reason: "nestabilní klíč" };
  }

  try {
    const db = serviceClient();
    const { error } = await db.from("domain_events").insert({
      event_key: key, type, entity, entity_id: entityId, payload,
    });

    // 23505 = klíč už existuje. Událost je zpracovaná, není to chyba.
    if (error && (error as { code?: string }).code === "23505") {
      return { emitted: false, reason: "duplicita" };
    }
    if (error) throw error;

    return { emitted: true };
  } catch (err) {
    log("error", "events", "zápis události selhal", {
      type, entityId, error: err instanceof Error ? err.message : String(err),
    });
    return { emitted: false, reason: "zápis selhal" };
  }
}

export type PendingEvent = {
  id: number;
  type: EventType;
  entity: string;
  entity_id: string;
  payload: Record<string, unknown>;
};

/** Nezpracované události, nejstarší první. */
export async function pending(limit = 100): Promise<PendingEvent[]> {
  const db = serviceClient();
  const { data, error } = await db
    .from("domain_events")
    .select("id, type, entity, entity_id, payload")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PendingEvent[];
}

export async function markProcessed(id: number, error?: string): Promise<void> {
  const db = serviceClient();
  await db
    .from("domain_events")
    .update({ processed_at: new Date().toISOString(), error: error ?? null })
    .eq("id", id);
}
