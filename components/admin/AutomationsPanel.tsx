"use client";

import { useMemo, useState } from "react";
import {
  AUTOMATIONS,
  RECENT,
  RISK_LABEL,
  TRIGGER_STATS,
  type Automation,
} from "@/lib/demo/automations";

type Tab = "vse" | "aktivni" | "vypnute" | "log";

const TABS: { key: Tab; label: string }[] = [
  { key: "vse", label: "Všechny" },
  { key: "aktivni", label: "Zapnuté" },
  { key: "vypnute", label: "Vypnuté" },
  { key: "log", label: "Poslední běhy" },
];

export default function AutomationsPanel() {
  const [tab, setTab] = useState<Tab>("vse");
  const [state, setState] = useState(() =>
    Object.fromEntries(AUTOMATIONS.map((a) => [a.id, a.active]))
  );
  const [paused, setPaused] = useState(false);
  const [confirm, setConfirm] = useState<Automation | null>(null);

  const rows = useMemo(() => {
    if (tab === "aktivni") return AUTOMATIONS.filter((a) => state[a.id]);
    if (tab === "vypnute") return AUTOMATIONS.filter((a) => !state[a.id]);
    return AUTOMATIONS;
  }, [tab, state]);

  function toggle(a: Automation) {
    // Zapnout něco, co sahá na peníze nebo odesílá tipy, chce potvrzení.
    // Vypnout jde vždycky hned — brzda nesmí mít překážku.
    if (!state[a.id] && a.risk !== "safe") {
      setConfirm(a);
      return;
    }
    setState((s) => ({ ...s, [a.id]: !s[a.id] }));
  }

  function confirmOn() {
    if (!confirm) return;
    setState((s) => ({ ...s, [confirm.id]: true }));
    setConfirm(null);
  }

  return (
    <>
      <div className={`au-master ${paused ? "au-master--off" : ""}`}>
        <span className="au-master__text">
          <span className="au-master__title">
            {paused ? "Všechny automatizace jsou zastavené" : "Automatizace běží"}
          </span>
          <span className="au-master__hint">
            {paused
              ? "Nic se neodesílá ani nespouští. Jednotlivá nastavení zůstala beze změny."
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

      <div className="set-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`set-tab ${tab === t.key ? "set-tab--on" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "log" ? (
        <div className="adm-panel" style={{ marginTop: 0 }}>
          <p className="adm-panel__title">Poslední běhy</p>
          <div style={{ marginTop: 10 }}>
            {RECENT.map((r) => (
              <div key={r.name + r.when} className="au-log">
                <span className={`au-dot ${r.ok ? "au-dot--ok" : "au-dot--bad"}`} />
                <span className="au-log__name">{r.name}</span>
                <span className="data au-log__when">{r.when}</span>
              </div>
            ))}
          </div>
          <p className="adm-todo__note">
            Plný log s podrobnostmi o každém běhu bude v sekci Log událostí.
          </p>
        </div>
      ) : (
        <div className="au-list">
          {rows.map((a) => {
            const on = state[a.id] && !paused;
            const risk = RISK_LABEL[a.risk];
            return (
              <article key={a.id} className={`au-item ${on ? "" : "au-item--off"}`}>
                <div className="au-item__head">
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="au-item__name">{a.name}</span>
                    <span className="au-item__what">{a.what}</span>
                  </span>
                  <button
                    role="switch"
                    aria-checked={state[a.id]}
                    aria-label={`${a.name} — ${state[a.id] ? "vypnout" : "zapnout"}`}
                    onClick={() => toggle(a)}
                    disabled={paused}
                    className={`set-switch ${state[a.id] ? "set-switch--on" : ""}`}
                  >
                    <span className="set-switch__knob" />
                  </button>
                </div>

                <div className="au-flow">
                  <span className="au-when">
                    <i className="ti ti-bolt" aria-hidden="true" />
                    {a.trigger}
                  </span>
                  {a.condition && (
                    <span className="au-if">
                      <i className="ti ti-filter" aria-hidden="true" />
                      {a.condition}
                    </span>
                  )}
                  <i className="ti ti-arrow-right au-arrow" aria-hidden="true" />
                  {a.actions.map((act) => (
                    <span key={act} className="au-act">{act}</span>
                  ))}
                </div>

                <div className="au-meta">
                  <span className="au-tag" style={{ color: risk.color, background: risk.bg }}>
                    {risk.label}
                  </span>
                  {a.consent && (
                    <span className="au-tag" style={{ color: "#9db3a5", background: "rgba(143,163,150,0.1)" }}>
                      Jen se souhlasem s marketingem
                    </span>
                  )}
                  <span className="au-sp" />
                  <span className="data au-num">{a.runs30d}× za 30 dní</span>
                  <span
                    className="data au-num"
                    style={{ color: a.okRate >= 99 ? "#7ef0a8" : a.okRate >= 95 ? "#ffc94a" : "#ff6b6b" }}
                  >
                    {a.runs30d === 0 ? "—" : `${a.okRate.toFixed(1).replace(".", ",")} % doběhlo`}
                  </span>
                  <span className="data au-num" style={{ color: "#5b6c61" }}>{a.lastRunAgo}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="au-side">
        <div className="adm-panel" style={{ marginTop: 0 }}>
          <p className="adm-panel__title">Co spouští automatizace nejčastěji</p>
          <div style={{ marginTop: 12 }}>
            {TRIGGER_STATS.map((t) => (
              <div key={t.name} className="au-bar">
                <div className="au-bar__top">
                  <span className="au-bar__name">{t.name}</span>
                  <span className="data au-bar__n">{t.runs} · {t.share} %</span>
                </div>
                <div className="au-bar__track">
                  <div className="au-bar__fill" style={{ width: `${t.share * 3.2}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {confirm && (
        <>
          <div className="cl-scrim" onClick={() => setConfirm(null)} />
          <div className="au-confirm" role="dialog" aria-label="Potvrzení zapnutí">
            <p className="au-confirm__title">Zapnout „{confirm.name}“?</p>
            <p className="au-confirm__text">
              {confirm.risk === "money"
                ? "Tahle automatizace mění členství a přístupy klientů. Poběží bez dalšího potvrzení."
                : "Tahle automatizace odesílá tipy klientům. Poběží bez dalšího potvrzení."}
            </p>
            <div className="au-confirm__what">
              <span className="au-when">
                <i className="ti ti-bolt" aria-hidden="true" />
                {confirm.trigger}
              </span>
              <i className="ti ti-arrow-right au-arrow" aria-hidden="true" />
              {confirm.actions.map((act) => (
                <span key={act} className="au-act">{act}</span>
              ))}
            </div>
            <div className="adm-actions" style={{ marginTop: 18 }}>
              <button className="adm-btn adm-btn--primary" onClick={confirmOn}>Zapnout</button>
              <button className="adm-btn" onClick={() => setConfirm(null)}>Zrušit</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
