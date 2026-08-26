import { serviceClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { emit } from "@/lib/events/bus";
import { log } from "@/lib/log";

/**
 * Schválení kandidáta.
 *
 * Zápis do `approvals` je nemazatelná stopa: kdo, kdy a **jaký kurz
 * v tu chvíli viděl**. Ten poslední údaj je podstatný — kurz se hýbe
 * a při sporu je rozdíl mezi "schválil špatně" a "schválil správně,
 * pak se trh pohnul".
 */

export type Decision = "approved" | "rejected";

export type ApproveResult =
  | { ok: true; alreadyDecided: boolean }
  | { ok: false; reason: string };

export async function decideCandidate(
  candidateId: string,
  approverId: string,
  decision: Decision,
  note?: string
): Promise<ApproveResult> {
  const db = serviceClient();

  const { data: cand, error } = await db
    .from("candidates")
    .select("id, status, offered_odds, threshold_odds, ev, units, event_name")
    .eq("id", candidateId)
    .maybeSingle<{
      id: string; status: string; offered_odds: number;
      threshold_odds: number; ev: number; units: number; event_name: string;
    }>();

  if (error || !cand) return { ok: false, reason: "Kandidát nenalezen." };

  // Rozhodnutý kandidát se nepřerozhoduje. Změna názoru se dělá
  // novým záznamem, ne přepsáním historie.
  if (cand.status !== "pending") {
    return { ok: true, alreadyDecided: true };
  }

  const { error: apErr } = await db.from("approvals").insert({
    candidate_id: candidateId,
    approver_id: approverId,
    odds_seen: cand.offered_odds,
    decision,
    note: note ?? null,
  });

  if (apErr) {
    log("error", "approve", "zápis schválení selhal", { candidateId, error: apErr.message });
    return { ok: false, reason: "Zápis schválení selhal." };
  }

  const { error: upErr } = await db
    .from("candidates")
    .update({ status: decision })
    .eq("id", candidateId)
    .eq("status", "pending"); // brání souběžnému přepsání

  if (upErr) return { ok: false, reason: "Změna stavu selhala." };

  await audit({
    action: decision === "approved" ? "candidate.approved" : "candidate.rejected",
    entity: "candidates",
    entityId: candidateId,
    actorId: approverId,
    source: "manual",
    previous: { status: "pending" },
    next: { status: decision, oddsSeen: cand.offered_odds, thresholdOdds: cand.threshold_odds },
    reason: note,
  });

  await emit(
    decision === "approved" ? "candidate.approved" : "candidate.rejected",
    "candidates",
    candidateId,
    { oddsSeen: cand.offered_odds, ev: cand.ev, units: cand.units }
  );

  return { ok: true, alreadyDecided: false };
}
