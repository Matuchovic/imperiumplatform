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

type Pristup = {
  polozka_id: number;
  nazev: string;
  jmeno: string | null;
  akce: string;
  created_at: string;
};

const SKRYT_PO_MS = 20_000;
const ROK_MS = 365 * 864e5;

/** Heslo starší roku je největší riziko v trezoru. */
const stare = (iso: string) => Date.now() - new Date(iso).getTime() > ROK_MS;

function vek(iso: string): string {
  const dni = Math.round((Date.now() - new Date(iso).getTime()) / 864e5);
  if (dni < 1) return "změněno dnes";
  if (dni < 31) return `změněno před ${dni} dny`;
  const mesice = Math.round(dni / 30);
  return mesice < 12
    ? `změněno před ${mesice} měsíci`
    : `změněno před ${Math.round(dni / 365 * 12)} měsíci`;
}

const kdy = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "právě teď";
  if (min < 60) return `před ${min} min`;
  if (min < 1440) return `před ${Math.round(min / 60)} h`;
  return new Date(iso).toLocaleDateString("cs-CZ");
};

const iniciály = (j: string | null) =>
  (j ?? "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

export default function TrezorPanel({ jeSpravce }: { jeSpravce: boolean }) {
  const [polozky, setPolozky] = useState<Polozka[]>([]);
  const [odhalene, setOdhalene] = useState<Record<number, string>>({});
  const [pristupy, setPristupy] = useState<Pristup[]>([]);
  const [dnes, setDnes] = useState(0);
  const [stara, setStara] = useState(0);
  const [hledat, setHledat] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);
  const [novy, setNovy] = useState(false);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch("/api/trezor", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Načtení selhalo.");
      else {
        setPolozky(d.polozky ?? []);
        setPristupy(d.pristupy ?? []);
        setDnes(d.zobrazenoDnes ?? 0);
        setStara(d.stara ?? 0);
        setChyba(null);
      }
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

  const q = hledat.trim().toLowerCase();
  const nalezene = q
    ? polozky.filter((p) =>
        [p.nazev, p.uzivatel, p.poznamka, p.url].some((x) => x?.toLowerCase().includes(q)))
    : polozky;

  const skupiny = Object.keys(KATEGORIE)
    .map((k) => ({ klic: k, polozky: nalezene.filter((p) => p.kategorie === k) }))
    .filter((s) => s.polozky.length > 0);

  const zastarale = polozky.filter((p) => stare(p.updated_at)).length;

  const filtr = hledat.trim().toLowerCase();
  const videt = filtr
    ? polozky.filter((p) =>
        [p.nazev, p.uzivatel, p.poznamka].some((x) => x?.toLowerCase().includes(filtr))
      )
    : polozky;

  const skupiny = Object.keys(KATEGORIE)
    .map((k) => ({ klic: k, polozky: videt.filter((p) => p.kategorie === k) }))
    .filter((s) => s.polozky.length > 0);

  return (
    <>
      {chyba && (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text"><span className="adm-alert__title">{chyba}</span></span>
        </div>
      )}

      <div className="adm-cards">
        <div className="tz-kpi">
          <p className="tz-kpi__k">POLOŽEK</p>
          <p className="tz-kpi__n" style={{ color: "#dff5e8" }}>{polozky.length}</p>
        </div>
        <div className="tz-kpi">
          <p className="tz-kpi__k">ZOBRAZENO DNES</p>
          <p className="tz-kpi__n" style={{ color: "#7ef0a8" }}>{dnes}</p>
        </div>
        {/* Heslo starší roku je největší riziko v trezoru. */}
        <div className={`tz-kpi ${stara > 0 ? "tz-kpi--warn" : ""}`}>
          <p className="tz-kpi__k">BEZE ZMĚNY PŘES ROK</p>
          <p className="tz-kpi__n" style={{ color: stara > 0 ? "#ffc94a" : "#dff5e8" }}>{stara}</p>
        </div>
        <div className="tz-kpi">
          <p className="tz-kpi__k">ŠIFROVÁNÍ</p>
          <p className="tz-kpi__n" style={{ fontSize: 13, color: "#7ef0a8" }}>AES-256-GCM</p>
        </div>
      </div>

      <div className="adm-actions">
        <button className="adm-btn adm-btn--primary" onClick={() => setNovy(true)}>
          <i className="ti ti-plus" aria-hidden="true" />
          Přidat položku
        </button>
        <label className="tz-hledat">
          <i className="ti ti-search" aria-hidden="true" />
          <input
            value={hledat}
            onChange={(e) => setHledat(e.target.value)}
            placeholder="Hledat v trezoru…"
            aria-label="Hledat v trezoru"
          />
        </label>
      </div>

      {polozky.length === 0 ? (
        <div className="tz-skupina">
          <p className="tz-nadpis">
            <span className="tz-ikona"><i className="ti ti-key" aria-hidden="true" /></span>
            Trezor je prázdný
          </p>
          <p className="adm-panel__lead" style={{ marginTop: 10, marginBottom: 0 }}>
            Přidej první heslo. Ukládá se šifrovaně a každé zobrazení se zapíše do auditu.
          </p>
        </div>
      ) : videt.length === 0 ? (
        <div className="tz-skupina">
          <p className="adm-panel__lead" style={{ margin: 0 }}>
            Hledání „{hledat}" nic nenašlo.
          </p>
        </div>
      ) : (
        skupiny.map((sk) => (
          <div key={sk.klic} className="tz-skupina">
            <p className="tz-nadpis">
              <span className="tz-ikona">
                <i className={`ti ti-${KATEGORIE[sk.klic].ikona}`} aria-hidden="true" />
              </span>
              {KATEGORIE[sk.klic].label}
              <span className="tz-pocet">{sk.polozky.length}</span>
            </p>

            {sk.polozky.map((p) => {
              const jeStare = stare(p.updated_at);
              return (
                <div
                  key={p.id}
                  className={`tz-radek ${jeStare ? "tz-radek--warn" : ""}`}
                  style={{ ["--pruh" as string]: jeStare ? "#ffc94a" : "#7ef0a8" }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="tz-nazev">{p.nazev}</span>
                    <span className={`tz-meta ${jeStare ? "tz-meta--stare" : ""}`}>
                      {p.uzivatel && <span>{p.uzivatel}</span>}
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="tz-odkaz">
                          otevřít
                        </a>
                      )}
                      <span>{vek(p.updated_at)}</span>
                      {p.poznamka && <span>{p.poznamka}</span>}
                    </span>

                    <span className={`tz-heslo ${odhalene[p.id] ? "tz-heslo--vidi" : ""}`}>
                      {odhalene[p.id] ?? "••••••••••••"}
                      {odhalene[p.id] && <span className="tz-cas" />}
                    </span>
                  </span>

                  <span style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "flex-start" }}>
                    {jeStare && (
                      <span className="tz-tag" style={{ background: "rgba(255,201,74,.12)", color: "#ffc94a" }}>
                        obměnit
                      </span>
                    )}
                    {odhalene[p.id] && (
                      <button
                        className="tz-btn"
                        onClick={() => {
                          navigator.clipboard?.writeText(odhalene[p.id]);
                          // Zkopírované heslo opouští systém — zapíše se
                          // stejně jako zobrazení.
                          fetch("/api/trezor", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: p.id, akce: "zkopirovano" }),
                          }).catch(() => undefined);
                        }}
                        aria-label="Zkopírovat"
                      >
                        <i className="ti ti-copy" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      className="tz-btn"
                      onClick={() => odhal(p.id)}
                      aria-label={odhalene[p.id] ? "Skrýt" : "Zobrazit"}
                    >
                      <i className={`ti ti-eye${odhalene[p.id] ? "-off" : ""}`} aria-hidden="true" />
                    </button>
                    {jeSpravce && (
                      <button className="tz-btn tz-btn--zla" onClick={() => smaz(p.id, p.nazev)} aria-label="Smazat">
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ))
      )}

      {pristupy.length > 0 && (
        <div className="tz-skupina">
          <p className="tz-nadpis">
            <span className="tz-ikona"><i className="ti ti-history" aria-hidden="true" /></span>
            Kdo se díval
            <span className="tz-pocet">POSLEDNÍ {pristupy.length}</span>
          </p>

          <div style={{ marginTop: 11 }}>
            {pristupy.map((a, i) => (
              <div key={i} className="tz-pristup">
                <span className="tz-avatar">
                  {(a.jmeno ?? "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {a.jmeno ?? "někdo"} {a.akce === "zkopirovano" ? "zkopíroval" : "zobrazil"}{" "}
                  <strong>{a.nazev}</strong>
                </span>
                <span className="data" style={{ fontSize: 10.5, color: "#4d5c53", flexShrink: 0 }}>
                  {kdy(a.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="data" style={{
        margin: "16px 0 0", fontSize: 10, letterSpacing: "0.1em",
        lineHeight: 1.7, color: "#4c6d5b",
      }}>
        KAŽDÉ ZOBRAZENÍ SE ZAPÍŠE DO AUDITU · HESLO SE SAMO SKRYJE PO 20 S · MAZAT SMÍ JEN SPRÁVCE
      </p>

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
