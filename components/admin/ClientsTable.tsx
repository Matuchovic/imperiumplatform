"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CLIENTS,
  STATE_STYLE,
  TIER_STYLE,
  type Client,
  type ClientState,
} from "@/lib/demo/clients";

type Filter = "attention" | "all" | ClientState;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "attention", label: "Vyžadují pozornost" },
  { key: "all", label: "Všichni" },
  { key: "active", label: "Aktivní" },
  { key: "trial", label: "Zkušební" },
  { key: "inactive", label: "Neaktivní" },
  { key: "cancelled", label: "Zrušení" },
];

const czk = (n: number) => n.toLocaleString("cs-CZ");

export default function ClientsTable() {
  const [filter, setFilter] = useState<Filter>("attention");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      attention: CLIENTS.filter((x) => x.attention).length,
      all: CLIENTS.length,
      active: 0, trial: 0, inactive: 0, cancelled: 0,
    };
    CLIENTS.forEach((x) => { c[x.state] += 1; });
    return c;
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CLIENTS.filter((c) => {
      if (filter === "attention" && !c.attention) return false;
      if (filter !== "all" && filter !== "attention" && c.state !== filter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.id.includes(q)
      );
    });
  }, [filter, query]);

  const open = CLIENTS.find((c) => c.id === openId) ?? null;

  useEffect(() => {
    document.body.classList.toggle("no-scroll", Boolean(openId));
    return () => document.body.classList.remove("no-scroll");
  }, [openId]);

  // Detail se má zavřít Escapem, ne jen klepnutím vedle.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  return (
    <>
      <div className="cl-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`cl-tab ${filter === f.key ? "cl-tab--on" : ""}`}
            aria-pressed={filter === f.key}
          >
            {f.label}
            <span className="data cl-tab__n">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <label className="cl-find">
        <i className="ti ti-search" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jméno, e-mail nebo číslo klienta"
          aria-label="Hledat v klientech"
        />
      </label>

      {rows.length === 0 ? (
        <div className="adm-panel">
          <p className="adm-panel__title">Nikdo tu není</p>
          <p className="adm-panel__lead" style={{ marginBottom: 0 }}>
            {filter === "attention"
              ? "Dnes nikdo nepotřebuje zásah. To je dobrá zpráva."
              : "Zkus jiný filtr nebo jiné hledání."}
          </p>
        </div>
      ) : (
        <div className="scroll-x cl-wrap">
          <table className="cl-table">
            <thead>
              <tr>
                <th>Klient</th>
                <th>Tarif</th>
                <th>Stav</th>
                <th>Expirace</th>
                <th style={{ textAlign: "right" }}>Zaplaceno</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setOpenId(c.id)}
                  className={openId === c.id ? "cl-row--on" : ""}
                >
                  <td className="cl-cell-who">
                    <span className="cl-who">
                      <span className="cl-pic">{c.name.split(" ").map((p) => p[0]).join("")}</span>
                      <span style={{ minWidth: 0 }}>
                        <span className="cl-name">{c.name}</span>
                        <span className="cl-mail">{c.email}</span>
                      </span>
                    </span>
                    {c.attention && (
                      <span className={`cl-flag cl-flag--${c.attention.tone}`}>
                        {c.attention.reason}
                      </span>
                    )}
                  </td>
                  <td data-label="Tarif">
                    <span
                      className="data cl-tier"
                      style={{ background: TIER_STYLE[c.tier].bg, color: TIER_STYLE[c.tier].fg }}
                    >
                      {c.tier}
                    </span>
                  </td>
                  <td data-label="Stav">
                    <span className="cl-state" style={{ color: STATE_STYLE[c.state].color }}>
                      <span className="cl-dot" style={{ background: STATE_STYLE[c.state].color }} />
                      {STATE_STYLE[c.state].label}
                    </span>
                  </td>
                  <td className="data cl-dim" data-label="Expirace">
                    {c.expiresAt ?? "—"}
                    {c.expiresIn !== null && (
                      <span
                        className="cl-in"
                        style={{ color: c.expiresIn < 0 ? "#ff6b6b" : c.expiresIn <= 7 ? "#ffc94a" : "#5b6c61" }}
                      >
                        {c.expiresIn < 0
                          ? `před ${Math.abs(c.expiresIn)} dny`
                          : c.expiresIn === 0
                          ? "vyprší dnes"
                          : `za ${c.expiresIn} dní`}
                      </span>
                    )}
                  </td>
                  <td className="data cl-paid" data-label="Zaplaceno">
                    {czk(c.paidTotal)} Kč
                  </td>
                  <td className="cl-go">
                    <i className="ti ti-chevron-right cl-chev" aria-hidden="true" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <Detail client={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Detail({ client: c, onClose }: { client: Client; onClose: () => void }) {
  return (
    <>
      <div className="cl-scrim" onClick={onClose} />
      <aside className="cl-panel" role="dialog" aria-label={`Detail klienta ${c.name}`}>
        <div className="cl-panel__top">
          <span className="cl-pic cl-pic--lg">
            {c.name.split(" ").map((p) => p[0]).join("")}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="cl-panel__name">{c.name}</span>
            <span className="data cl-panel__id">#{c.id}</span>
          </span>
          <button onClick={onClose} className="tap cl-close" aria-label="Zavřít detail">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {c.attention && (
          <div className={`cl-note cl-note--${c.attention.tone}`}>{c.attention.reason}</div>
        )}

        <Group title="Kontakt">
          <Line k="E-mail" v={c.email} />
          <Line k="Telefon" v={c.phone} />
          <Line k="Poslední přihlášení" v={c.lastLogin} />
          <Line k="Manažer" v={c.manager} />
        </Group>

        <Group title="Členství">
          <Line k="Tarif" v={c.tier} />
          <Line k="Stav" v={STATE_STYLE[c.state].label} color={STATE_STYLE[c.state].color} />
          <Line k="Registrace" v={c.registeredAt} />
          <Line k="Expirace" v={c.expiresAt ?? "—"} />
          <Line k="Zaplaceno celkem" v={`${czk(c.paidTotal)} Kč`} />
        </Group>

        <Group title="Výsledky">
          <Line k="Odehraných tipů" v={String(c.openTips)} />
          <Line k="Úspěšnost" v={`${c.hitRate.toString().replace(".", ",")} %`} />
          <Line
            k="Zisk"
            v={`${c.profit > 0 ? "+" : ""}${czk(c.profit)} Kč`}
            color={c.profit >= 0 ? "#7ef0a8" : "#ff6b6b"}
          />
          <Line
            k="ROI"
            v={`${c.roi > 0 ? "+" : ""}${c.roi.toString().replace(".", ",")} %`}
            color={c.roi >= 0 ? "#7ef0a8" : "#ff6b6b"}
          />
        </Group>

        {c.tags.length > 0 && (
          <Group title="Štítky">
            <div className="cl-tags">
              {c.tags.map((t) => (
                <span key={t} className="cl-tag">{t}</span>
              ))}
            </div>
          </Group>
        )}

        {c.note && (
          <Group title="Poznámka">
            <p className="cl-memo">{c.note}</p>
          </Group>
        )}

        <div className="adm-actions" style={{ marginTop: 20 }}>
          <button className="adm-btn adm-btn--primary">
            <i className="ti ti-message" aria-hidden="true" />
            Napsat
          </button>
          <button className="adm-btn">Upravit plán</button>
        </div>
      </aside>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="cl-group">
      <p className="cl-group__title">{title}</p>
      {children}
    </div>
  );
}

function Line({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="cl-line">
      <span className="cl-line__k">{k}</span>
      <span className="data cl-line__v" style={color ? { color } : undefined}>{v}</span>
    </div>
  );
}
