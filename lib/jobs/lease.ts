/**
 * Rozhodování o zámku úlohy. Čisté funkce, bez databáze.
 *
 * Řeší souběh: když se cron omylem spustí dvakrát nebo když manuální
 * běh potká naplánovaný, smí pokračovat jen jeden.
 */

export type Lease = {
  jobKey: string;
  holder: string;
  acquiredAt: string;
  expiresAt: string;
};

export const DEFAULT_LEASE_MINUTES = 10;

export function leaseExpiry(from: Date, minutes = DEFAULT_LEASE_MINUTES): string {
  return new Date(from.getTime() + minutes * 60000).toISOString();
}

export function isExpired(lease: Lease, now: Date = new Date()): boolean {
  return new Date(lease.expiresAt).getTime() <= now.getTime();
}

export type LeaseDecision =
  | { acquire: true; reason: "free" | "expired" }
  | { acquire: false; reason: "held"; heldBy: string; expiresIn: number };

/**
 * Vypršelý zámek se smí převzít — jinak by pád běhu zablokoval úlohu
 * napořád a nikdo by nevěděl proč.
 */
export function decide(existing: Lease | null, now: Date = new Date()): LeaseDecision {
  if (!existing) return { acquire: true, reason: "free" };
  if (isExpired(existing, now)) return { acquire: true, reason: "expired" };

  return {
    acquire: false,
    reason: "held",
    heldBy: existing.holder,
    expiresIn: Math.round((new Date(existing.expiresAt).getTime() - now.getTime()) / 1000),
  };
}
