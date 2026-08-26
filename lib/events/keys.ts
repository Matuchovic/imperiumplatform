/**
 * Klíče doménových událostí. Čisté funkce — o idempotenci rozhoduje
 * tvar klíče, ne kód, který ho zapisuje.
 *
 * Pravidlo: klíč musí být odvozený jen z toho, co se stalo. Když do
 * něj vloží někdo čas nebo náhodu, idempotence přestane platit.
 */

export type EventType =
  | "candidate.created" | "candidate.approved" | "candidate.rejected"
  | "ticket.created" | "ticket.settled" | "ticket.voided"
  | "bankroll.changed"
  | "odds.updated" | "odds.rapid_move" | "odds.value_lost"
  | "market.suspended" | "market.restored" | "market.anomaly"
  | "telegram.delivered" | "telegram.failed"
  | "provider.error" | "engine.run_completed";

export function eventKey(type: EventType, entityId: string, discriminator?: string): string {
  return discriminator ? `${type}:${entityId}:${discriminator}` : `${type}:${entityId}`;
}

/** Klíč nesmí obsahovat čas ani náhodu — jinak není idempotentní. */
export function isStableKey(key: string): boolean {
  if (/\d{13}/.test(key)) return false;                    // timestamp v ms
  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(key)) return false; // ISO čas
  return true;
}
