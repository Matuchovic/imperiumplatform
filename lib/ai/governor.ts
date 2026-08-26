import { checkPermission, FORBIDDEN_ALWAYS, type AgentId, type ToolName } from "./permissions";

/**
 * Risk Governor — bezpečnostní politika nad AI vrstvou.
 *
 * Není to agent s pravomocí. Je to brána, kterou musí projít každé
 * volání nástroje: oprávnění, limity, duplicity, nouzový vypínač.
 */

export type GovernorState = {
  paused: boolean;
  writesEnabled: boolean;
  /** Kolik akcí už agent provedl v aktuálním okně. */
  actionsInWindow: number;
  maxActionsPerWindow: number;
  /** Klíče akcí provedených v okně — proti duplicitám. */
  recentKeys: ReadonlySet<string>;
};

export type Verdict =
  | { decision: "allow" }
  | { decision: "needs_approval"; reason: string }
  | { decision: "deny"; reason: string };

export const DEFAULT_MAX_ACTIONS = 50;

export function govern(
  agent: AgentId,
  tool: ToolName,
  actionKey: string,
  state: GovernorState
): Verdict {
  // Nouzový vypínač má přednost před vším ostatním.
  if (state.paused) {
    return { decision: "deny", reason: "AI operace jsou pozastavené." };
  }

  if (FORBIDDEN_ALWAYS.has(tool)) {
    return { decision: "deny", reason: `Nástroj ${tool} je pro AI zakázaný bez výjimky.` };
  }

  const perm = checkPermission(agent, tool);
  if (!perm.allowed) return { decision: "deny", reason: perm.reason };

  if (perm.level !== "READ" && perm.level !== "SUGGEST" && !state.writesEnabled) {
    return { decision: "deny", reason: "Zápisové AI akce jsou vypnuté." };
  }

  if (state.recentKeys.has(actionKey)) {
    return { decision: "deny", reason: "Stejná akce už v tomhle okně proběhla." };
  }

  if (state.actionsInWindow >= state.maxActionsPerWindow) {
    return { decision: "deny", reason: "Vyčerpán limit AI akcí pro okno." };
  }

  if (perm.needsApproval) {
    return { decision: "needs_approval", reason: `Nástroj ${tool} vyžaduje schválení člověkem.` };
  }

  return { decision: "allow" };
}
