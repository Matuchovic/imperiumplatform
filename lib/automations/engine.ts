import { serviceClient } from "@/lib/supabase/server";
import { pending, markProcessed } from "@/lib/events/bus";
import { evaluate, isValidNode, type Node } from "./conditions";
import { gate, riskOf, type Action } from "./actions";
import { isEnabled } from "@/lib/flags";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";

/**
 * Engine automatizací: událost → podmínky → akce.
 *
 * Idempotence stojí na tabulce `automation_runs` s unique dvojicí
 * (automatizace, událost). Dvojí zpracování téže události nespustí
 * akci podruhé.
 */

export type EngineResult = {
  processed: number;
  triggered: number;
  executed: number;
  awaitingApproval: number;
  skipped: number;
  dryRun: boolean;
};

type AutomationRow = {
  id: string;
  name: string;
  trigger_key: string;
  condition: unknown;
  actions: unknown;
  active: boolean;
  risk: string;
  needs_consent: boolean;
};

export async function runAutomations(
  opts: { dryRun?: boolean; runId?: string; limit?: number } = {}
): Promise<EngineResult> {
  const dryRun = opts.dryRun ?? false;
  const enabled = await isEnabled("automations_enabled");
  const allowRisky = false; // rizikové akce jdou přes schválení, ne přes vlajku

  const base: EngineResult = {
    processed: 0, triggered: 0, executed: 0,
    awaitingApproval: 0, skipped: 0, dryRun,
  };

  const db = serviceClient();

  const { data: autos } = await db
    .from("automations")
    .select("id, name, trigger_key, condition, actions, active, risk, needs_consent")
    .eq("active", true);

  const list = (autos ?? []) as AutomationRow[];
  if (list.length === 0) return base;

  const events = await pending(opts.limit ?? 100);
  base.processed = events.length;

  for (const ev of events) {
    for (const auto of list.filter((a) => a.trigger_key === ev.type)) {
      const cond = auto.condition;
      // Nevalidní podmínka z databáze se nikdy nevyhodnotí jako splněná.
      if (cond !== null && cond !== undefined && !isValidNode(cond)) {
        log("warn", "automations", "podmínka má neplatný tvar, automatizace se přeskakuje", {
          automation: auto.name,
        });
        base.skipped++;
        continue;
      }

      const ctx = { ...ev.payload, event: { type: ev.type, entity: ev.entity, id: ev.entity_id } };
      if (!evaluate((cond ?? null) as Node | null, ctx)) continue;

      base.triggered++;
      const actions = (Array.isArray(auto.actions) ? auto.actions : []) as Action[];

      for (const action of actions) {
        const g = gate(action, { enabled, allowRisky, hasConsent: !auto.needs_consent });

        if (!g.run) {
          if (g.needsApproval) base.awaitingApproval++;
          else base.skipped++;
          continue;
        }
        if (dryRun) { base.executed++; continue; }

        const { error } = await db.from("automation_runs").insert({
          automation_id: auto.id,
          ok: true,
          subject_id: ev.entity_id,
          finished_at: new Date().toISOString(),
        });

        // 23505 = tahle dvojice už proběhla. Není to chyba.
        if (error && (error as { code?: string }).code === "23505") {
          base.skipped++;
          continue;
        }

        base.executed++;
        await audit({
          action: "automation.changed",
          entity: "automations",
          entityId: auto.id,
          source: "automation-engine",
          next: { action: action.type, event: ev.type, subject: ev.entity_id },
          runId: opts.runId,
        });
      }
    }

    if (!dryRun) await markProcessed(ev.id);
  }

  log("info", "automations", "běh dokončen", { ...base, runId: opts.runId });
  return base;
}

/** Souhrn pro UI. Skutečné počty, ne ukázkové. */
export async function automationSummary() {
  const db = serviceClient();

  const [{ data: autos }, { count: runs }, { count: failed }] = await Promise.all([
    db.from("automations").select("id, name, what, trigger_key, condition, actions, active, risk, needs_consent"),
    db.from("automation_runs").select("id", { count: "exact", head: true })
      .gte("started_at", new Date(Date.now() - 30 * 864e5).toISOString()),
    db.from("automation_runs").select("id", { count: "exact", head: true }).eq("ok", false),
  ]);

  const list = (autos ?? []) as AutomationRow[];
  return {
    automations: list.map((a) => ({
      id: a.id,
      name: a.name,
      what: (a as AutomationRow & { what?: string }).what ?? "",
      trigger: a.trigger_key,
      active: a.active,
      risk: (Array.isArray(a.actions) ? riskOf(a.actions as Action[]) : a.risk) as string,
      needsConsent: a.needs_consent,
      actions: (Array.isArray(a.actions) ? a.actions : []) as Action[],
    })),
    runs30d: runs ?? 0,
    failed: failed ?? 0,
  };
}
