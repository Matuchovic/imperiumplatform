"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Trezor hesel.
 *
 * Seznam nikdy neobsahuje hesla — ta se vydávají jednotlivě a každé
 * zobrazení se zapíše do auditu. Odhalené heslo navíc samo zmizí,
 * aby nezůstalo viset na obrazovce.
 */

type Polozka = {
  id: number;
  nazev: string;
  kategorie: string;
  uzivatel: string | null;
  url: string | null;
  poznamka: string | null;
  updated_at: string;
};

const KATEGORIE: Record<string, { label: string; ikona: string }> = {
  sluzba: { label: "Služby", ikona: "cloud" },
  databaze: { label: "Databáze", ikona: "database" },
  platby: { label: "Platby", ikona: "credit-card" },
  socialni: { label: "Sociální sítě", ikona: "share" },
  ostatni: { label: "Ostatní", ikona: "key" },
};

const SKRYT_PO_MS = 20_000;

export default function TrezorPanel({ jeSpravce }: { jeSpravce: boolean }) {
  const [polozky, setPolozky] = useState<Polozka[]>([]);
  const [odhalene, setOdhalene] = useState<Record<number, string>>({});
  const [chyba, setChyba] = useState<string | null>(null);
  const [novy, setNovy] = useState(false);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch("/api/trezor", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Načtení selhalo.");
      else { setPolozky(d.polozky ?? []); setChyba(null); }
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }, []);

  useEffect(() => { nacti(); }, [nacti]);

  async function odhal(id: number) {
    if (odhalene[id]) {
      setOdhalene((o) => { const n = { ...o }; delete n[id]; return n; });
      return;
    }
    try {
      const r = await fetch("/api/trezor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setChyba(d?.error ?? "Zobrazení selhalo."); return; }

      setOdhalene((o) => ({ ...o, [id]: d.heslo }));
      // Heslo na obrazovce nemá co viset. Po dvaceti vteřinách zmizí.
      setTimeout(() => {
        setOdhalene((o) => { const n = { ...o }; delete n[id]; return n; });
      }, SKRYT_PO_MS);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }

  async function smaz(id: number, nazev: string) {
    if (!confirm(`Smazat „${nazev}"? Heslo se nedá obnovit.`)) return;
    setPolozky((p) => p.filter((x) => x.id !== id));
    const r = await fetch(`/api/trezor?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) nacti();
  }

  const skupiny = Object.keys(KATEGORIE)
    .map((k) => ({ klic: k, polozky: polozky.filter((p) => p.kategorie === k) }))
    .filter((s) => s.polozky.length > 0);

  return (
    <>
      {chyba && (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text"><span className="adm-alert__title">{chyba}</span></span>
        </div>
      )}

      <div className="adm-actions" style={{ marginTop: 0 }}>
        <button className="adm-btn adm-btn--primary" onClick={() => setNovy(true)}>
          <i className="ti ti-plus" aria-hidden="true" />
          Přidat položku
        </button>
      </div>

      {polozky.length === 0 ? (
        <div className="adm-panel">
          <p className="adm-panel__title">Trezor je prázdný</p>
          <p className="adm-panel__lead" style={{ marginBottom: 0 }}>
            Přidej první heslo. Ukládá se šifrovaně a každé zobrazení se zapíše do auditu.
          </p>
        </div>
      ) : (
        skupiny.map((s) => (
          <div key={s.klic} className="adm-panel">
            <p className="adm-panel__title">
              <i className={`ti ti-${KATEGORIE[s.klic].ikona}`} style={{ marginRight: 7, fontSize: 15 }} aria-hidden="true" />
              {KATEGORIE[s.klic].label}
            </p>

            <div style={{ marginTop: 6 }}>
              {s.polozky.map((p) => (
                <div key={p.id} className="tz-radek">
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="tz-nazev">{p.nazev}</span>
                    <span className="tz-meta">
                      {p.uzivatel && <span>{p.uzivatel}</span>}
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="tz-odkaz">
                          otevřít
                        </a>
                      )}
                      {p.poznamka && <span>{p.poznamka}</span>}
                    </span>

                    <span className={`tz-heslo ${odhalene[p.id] ? "tz-heslo--vidi" : ""}`}>
                      {odhalene[p.id] ?? "••••••••••••"}
                    </span>
                  </span>

                  <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {odhalene[p.id] && (
                      <button
                        className="kal__pridat tap"
                        onClick={() => navigator.clipboard?.writeText(odhalene[p.id])}
                        aria-label="Zkopírovat"
                      >
                        <i className="ti ti-copy" aria-hidden="true" />
                      </button>
                    )}
                    <button className="kal__pridat tap" onClick={() => odhal(p.id)}
                            aria-label={odhalene[p.id] ? "Skrýt" : "Zobrazit"}>
                      <i className={`ti ti-eye${odhalene[p.id] ? "-off" : ""}`} aria-hidden="true" />
                    </button>
                    {jeSpravce && (
                      <button className="kal__smazat tap" onClick={() => smaz(p.id, p.nazev)} aria-label="Smazat">
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {novy && <FormularPolozky onZavri={() => setNovy(false)} onUlozeno={() => { setNovy(false); nacti(); }} />}
    </>
  );
}

function FormularPolozky({ onZavri, onUlozeno }: { onZavri: () => void; onUlozeno: () => void }) {
  const [f, setF] = useState({
    nazev: "", kategorie: "sluzba", uzivatel: "", tajemstvi: "", url: "", poznamka: "",
  });
  const [bezi, setBezi] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const zmen = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function uloz() {
    if (!f.nazev.trim() || !f.tajemstvi) { setChyba("Vyplň název a heslo."); return; }
    setBezi(true);
    setChyba(null);
    try {
      const r = await fetch("/api/trezor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Uložení selhalo.");
      else onUlozeno();
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setBezi(false);
  }

  return (
    <>
      <div className="cl-scrim" onClick={onZavri} />
      <aside className="cl-panel" role="dialog" aria-label="Nová položka trezoru">
        <div className="cl-panel__top">
          <span style={{ flex: 1 }}>
            <span className="cl-panel__name">Nová položka</span>
            <span className="data cl-panel__id">uloží se šifrovaně</span>
          </span>
          <button onClick={onZavri} className="tap cl-close" aria-label="Zavřít">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {chyba && (
          <div className="adm-alert adm-alert--bad">
            <span className="adm-alert__text"><span className="adm-alert__title">{chyba}</span></span>
          </div>
        )}

        <label className="set-pole">
          <span className="set-label">Název</span>
          <input className="set-input" value={f.nazev} onChange={(e) => zmen("nazev", e.target.value)}
                 placeholder="Supabase produkce" autoFocus />
        </label>

        <label className="set-pole">
          <span className="set-label">Kategorie</span>
          <select className="set-input" value={f.kategorie} onChange={(e) => zmen("kategorie", e.target.value)}>
            <option value="sluzba">Služby</option>
            <option value="databaze">Databáze</option>
            <option value="platby">Platby</option>
            <option value="socialni">Sociální sítě</option>
            <option value="ostatni">Ostatní</option>
          </select>
        </label>

        <label className="set-pole">
          <span className="set-label">Uživatel</span>
          <input className="set-input" value={f.uzivatel} onChange={(e) => zmen("uzivatel", e.target.value)}
                 placeholder="matuchovic@betim.cz" />
        </label>

        <label className="set-pole">
          <span className="set-label">Heslo nebo klíč</span>
          <input className="set-input" type="password" value={f.tajemstvi}
                 onChange={(e) => zmen("tajemstvi", e.target.value)} autoComplete="new-password" />
        </label>

        <label className="set-pole">
          <span className="set-label">Odkaz</span>
          <input className="set-input" value={f.url} onChange={(e) => zmen("url", e.target.value)}
                 placeholder="https://…" />
        </label>

        <label className="set-pole">
          <span className="set-label">Poznámka</span>
          <input className="set-input" value={f.poznamka} onChange={(e) => zmen("poznamka", e.target.value)} />
        </label>

        <div className="adm-actions">
          <button className="adm-btn adm-btn--primary" onClick={uloz} disabled={bezi}>
            {bezi ? "Ukládám…" : "Uložit"}
          </button>
          <button className="adm-btn" onClick={onZavri}>Zrušit</button>
        </div>
      </aside>
    </>
  );
}
