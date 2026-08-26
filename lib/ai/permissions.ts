/**
 * Oprávnění nástrojů pro agenty.
 *
 * Model nedostává volnou ruku. Každý agent smí jen to, co je tady
 * vyjmenované, a rizikové akce projdou jedině přes člověka.
 */

export type AgentId = "odds" | "risk" | "client" | "support" | "compliance" | "finance";

export type ToolLevel =
  /** jen čtení */
  | "READ"
  /** navrhne, neprovede */
  | "SUGGEST"
  /** nízkoriziková akce: úkol, poznámka, interní upozornění */
  | "SAFE_WRITE"
  /** provede se až po schválení člověkem */
  | "APPROVAL_REQUIRED"
  /** model nesmí nikdy */
  | "FORBIDDEN";

export type ToolName =
  | "readOddsHistory" | "readMarketState" | "readCandidate" | "readTicketAggregate"
  | "readClientSummary" | "readSupportThread" | "readAuditTail" | "readSystemHealth"
  | "createInsight" | "createTask" | "createInternalNotification"
  | "suggestAction"
  | "pauseDispatch" | "pauseAutomation" | "changeThreshold"
  | "modifyBankroll" | "settleTicket" | "changeUserRole" | "confirmPayment"
  | "deleteAudit" | "increaseStake" | "bypassRls";

/**
 * Co model nesmí nikdy, bez ohledu na agenta a bez možnosti schválení.
 * Tyhle akce se přes AI vrstvu neprovádějí vůbec — jen přímo člověkem.
 */
export const FORBIDDEN_ALWAYS: ReadonlySet<ToolName> = new Set([
  "modifyBankroll",
  "settleTicket",
  "changeUserRole",
  "confirmPayment",
  "deleteAudit",
  "increaseStake",
  "bypassRls",
]);

const MATRIX: Record<AgentId, Partial<Record<ToolName, ToolLevel>>> = {
  odds: {
    readOddsHistory: "READ", readMarketState: "READ", readCandidate: "READ",
    createInsight: "SAFE_WRITE", createInternalNotification: "SAFE_WRITE",
    suggestAction: "SUGGEST", pauseDispatch: "APPROVAL_REQUIRED",
  },
  risk: {
    readOddsHistory: "READ", readMarketState: "READ", readTicketAggregate: "READ",
    readSystemHealth: "READ",
    createInsight: "SAFE_WRITE", createInternalNotification: "SAFE_WRITE",
    suggestAction: "SUGGEST",
    pauseDispatch: "APPROVAL_REQUIRED", pauseAutomation: "APPROVAL_REQUIRED",
    changeThreshold: "APPROVAL_REQUIRED",
  },
  client: {
    readClientSummary: "READ", readTicketAggregate: "READ",
    createTask: "SAFE_WRITE", createInternalNotification: "SAFE_WRITE",
    suggestAction: "SUGGEST",
  },
  support: {
    readSupportThread: "READ", readClientSummary: "READ",
    createTask: "SAFE_WRITE", suggestAction: "SUGGEST",
  },
  compliance: {
    readAuditTail: "READ", readClientSummary: "READ", readSystemHealth: "READ",
    createInternalNotification: "SAFE_WRITE", suggestAction: "SUGGEST",
    pauseAutomation: "APPROVAL_REQUIRED",
  },
  finance: {
    readSystemHealth: "READ", createInternalNotification: "SAFE_WRITE",
    suggestAction: "SUGGEST",
  },
};

export type PermissionCheck =
  | { allowed: true; level: Exclude<ToolLevel, "FORBIDDEN">; needsApproval: boolean }
  | { allowed: false; reason: string };

export function checkPermission(agent: AgentId, tool: ToolName): PermissionCheck {
  if (FORBIDDEN_ALWAYS.has(tool)) {
    return { allowed: false, reason: `Nástroj ${tool} je pro AI zakázaný bez výjimky.` };
  }
  const level = MATRIX[agent]?.[tool];
  if (!level || level === "FORBIDDEN") {
    return { allowed: false, reason: `Agent ${agent} nemá oprávnění k ${tool}.` };
  }
  return { allowed: true, level, needsApproval: level === "APPROVAL_REQUIRED" };
}

export const toolsFor = (agent: AgentId): ToolName[] =>
  Object.keys(MATRIX[agent] ?? {}) as ToolName[];
