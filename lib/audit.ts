import { serviceClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

/**
 * Auditní stopa. Existuje dřív, než cokoli začne měnit peníze nebo
 * stavy — obráceně by se první chyba nedala dohledat.
 *
 * Zápis nikdy nesmí shodit operaci, kterou zaznamenává. Když selže,
 * zaloguje se a pokračuje se dál.
 */

export type AuditAction =
  | "role.changed"
  | "limits.changed"
  | "bankroll.corrected"
  | "candidate.approved"
  | "candidate.rejected"
  | "ticket.settled"
  | "settlement.corrected"
  | "settings.changed"
  | "automation.changed"
  | "emergency.stop"
  | "provider.configured"
  | "subscription.changed"
  | "ai.action_approved"
  | "ai.action_rejected"
  // Zobrazení hesla je auditní událost stejné váhy jako změna
  // nastavení — bez záznamu by trezor byl jen sdílená složka.
  | "trezor.revealed"
  | "trezor.created"
  | "trezor.deleted"
  | "cloud.deleted";

export type AuditEntry = {
  action: AuditAction;
  entity: string;
  entityId: string;
  actorId?: string | null;
  /** Zdroj: uživatel, cron, agent. */
  source: string;
  previous?: unknown;
  next?: unknown;
  reason?: string;
  runId?: string;
};

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const db = serviceClient();
    const { error } = await db.from("audit_log").insert({
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId,
      actor_id: entry.actorId ?? null,
      source: entry.source,
      previous: entry.previous ?? null,
      next: entry.next ?? null,
      reason: entry.reason ?? null,
      run_id: entry.runId ?? null,
    });
    if (error) throw error;
  } catch (err) {
    // Selhání auditu nesmí zrušit operaci, kterou zaznamenává.
    log("error", "audit", "zápis do auditu selhal", {
      action: entry.action,
      entity: entry.entity,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
