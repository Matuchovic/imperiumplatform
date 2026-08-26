"use client";

import { useState } from "react";

export type AutomationView = {
  id: string;
  name: string;
  what: string;
  trigger: string;
  active: boolean;
  risk: string;
  needsConsent: boolean;
  actions: { type: string }[];
};

const RISK: Record<string, { label: string; color: string; bg: string }> = {
  safe:    { label: "Bez rizika",      color: "#8fa396", bg: "rgba(143,163,150,0.1)" },
  money:   { label: "Sahá na peníze",  color: "#ffc94a", bg: "rgba(255,201,74,0.1)" },
  betting: { label: "Odesílá tipy",    color: "#5eead4", bg: "rgba(94,234,212,0.1)" },
};

const ACTION_LABEL: Record<string, string> = {
  create_notification: "Interní upozornění",
  create_task: "Vytvořit úkol",
  create_audit: "Zápis do auditu",
  request_approval: "Vyžádat schválení",
  send_telegram: "Odeslat Telegram",
  change_status: "Změnit stav",
};

export default function AutomationsPanel({
  automations, enabled,
}: {
  automations: AutomationView[];
  enabled: boolean;
}) {
  const [paused, setPaused] = useState(!enabled);

  return (
    <>
      <div className={`au-master ${paused ? "au-master--off" : ""}`}>
        <span className="au-master__text">
          <span className="au-master__title">
            {paused ? "Automatizace jsou zastavené" : "Automatizace běží"}
          </span>
          <span className="au-master__hint">
            {paused
              ? "Nic se nespouští. Nastavení jednotlivých automatizací zůstává."
              : "Když se něco pokazí, tímhle zastavíš všechno naráz. Nastavení se nesmaže."}
          </span>
        </span>
        <button
          onClick={() => setPaused((p) => !p)}
          className={`adm-btn ${paused ? "adm-btn--primary" : "au-stop"}`}
        >
          {paused ? "Spustit znovu" : "Zastavit vše"}
        </button>
      </div>

      <div className="au-list">
        {automations.map((a) => {
          const risk = RISK[a.risk] ?? RISK.safe;
          const on = a.active && !paused;
          return (
            <article key={a.id} className={`au-item ${on ? "" : "au-item--off"}`}>
              <div className="au-item__head">
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="au-item__name">{a.name}</span>
                  {a.what && <span className="au-item__what">{a.what}</span>}
                </span>
                <span
                  role="switch"
                  aria-checked={a.active}
                  aria-label={a.name}
                  className={`set-switch ${a.active ? "set-switch--on" : ""}`}
                >
                  <span className="set-switch__knob" />
                </span>
              </div>

              <div className="au-flow">
                <span className="au-when">
                  <i className="ti ti-bolt" aria-hidden="true" />
                  {a.trigger}
                </span>
                <i className="ti ti-arrow-right au-arrow" aria-hidden="true" />
                {a.actions.map((act, i) => (
                  <span key={`${act.type}-${i}`} className="au-act">
                    {ACTION_LABEL[act.type] ?? act.type}
                  </span>
                ))}
              </div>

              <div className="au-meta">
                <span className="au-tag" style={{ color: risk.color, background: risk.bg }}>
                  {risk.label}
                </span>
                {a.needsConsent && (
                  <span className="au-tag" style={{ color: "#9db3a5", background: "rgba(143,163,150,0.1)" }}>
                    Jen se souhlasem s marketingem
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
