/**
 * Akce automatizací a jejich rizikovost.
 *
 * Klasifikace určuje, co smí proběhnout samo a co potřebuje člověka.
 * Zůstává stejná jako v UI: safe / money / betting.
 */

export type ActionType =
  | "create_notification"
  | "create_task"
  | "send_telegram"
  | "change_status"
  | "create_audit"
  | "request_approval";

export type Risk = "safe" | "money" | "betting";

export type ActionSpec = {
  type: ActionType;
  risk: Risk;
  /** Smí odejít jen klientům se souhlasem s marketingem. */
  needsConsent: boolean;
  label: string;
};

export const ACTIONS: Record<ActionType, ActionSpec> = {
  create_notification: { type: "create_notification", risk: "safe", needsConsent: false, label: "Interní upozornění" },
  create_task:         { type: "create_task",         risk: "safe", needsConsent: false, label: "Vytvořit úkol" },
  create_audit:        { type: "create_audit",        risk: "safe", needsConsent: false, label: "Zápis do auditu" },
  request_approval:    { type: "request_approval",    risk: "safe", needsConsent: false, label: "Vyžádat schválení" },
  send_telegram:       { type: "send_telegram",       risk: "betting", needsConsent: false, label: "Odeslat Telegram" },
  change_status:       { type: "change_status",       risk: "money", needsConsent: false, label: "Změnit stav" },
};

export type Action = { type: ActionType; params?: Record<string, unknown> };

/** Nejvyšší riziko v sadě určuje riziko celé automatizace. */
export function riskOf(actions: Action[]): Risk {
  const order: Risk[] = ["safe", "money", "betting"];
  return actions.reduce<Risk>((worst, a) => {
    const r = ACTIONS[a.type]?.risk ?? "safe";
    return order.indexOf(r) > order.indexOf(worst) ? r : worst;
  }, "safe");
}

export type Gate =
  | { run: true }
  | { run: false; reason: string; needsApproval?: boolean };

/**
 * Brána před provedením akce.
 *
 * Rizikové akce se neprovedou samy, dokud to není výslovně povolené —
 * a marketing bez souhlasu neodejde nikdy, bez ohledu na nastavení.
 */
export function gate(
  action: Action,
  opts: { enabled: boolean; allowRisky: boolean; hasConsent: boolean }
): Gate {
  const spec = ACTIONS[action.type];
  if (!spec) return { run: false, reason: "Neznámá akce." };
  if (!opts.enabled) return { run: false, reason: "Automatizace jsou vypnuté." };

  if (spec.needsConsent && !opts.hasConsent) {
    return { run: false, reason: "Klient nemá souhlas s marketingem." };
  }

  if (spec.risk !== "safe" && !opts.allowRisky) {
    return { run: false, reason: `Akce ${spec.label} vyžaduje schválení.`, needsApproval: true };
  }

  return { run: true };
}
