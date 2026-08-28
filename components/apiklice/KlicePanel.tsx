"use client";

import { useCallback, useEffect, useState } from "react";
import {
  OPRAVNENI, VSECHNA_OPRAVNENI, NIKDY, BARVY_STAVU, stavKlice, maZapis,
  type Opravneni,
} from "@/lib/apiklice/klice";

/**
 * Správa API klíčů.
 *
 * Nový klíč se ukáže právě jednou. Do databáze jde jen otisk,
 * takže ho podruhé nezobrazí nikdo — ani správce.
 */

type Klic = {
  id: number; nazev: string; nahled: string; druh: string;
  opravneni: string[]; domeny: string[]; ip_seznam: string[]; limit_hod: number;
  plati_do: string | null; posledni_pouziti: string | null;
  odvolany_at: string | null; dobehne_do: string | null; created_at: string;
  dnes: number; graf: number[]; chyb: number;
};

const NAZVY_STAVU: Record<string, string> = {
  aktivni: "AKTIVNÍ", spici: "NEPOUŽITÝ", vyprsel: "VYPRŠEL", odvolany: "ODVOLANÝ",
};

const den = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("cs-CZ") : "nikdy";

export default function KlicePanel() {
  const [klice, setKlice] = useState<Klic[]>([]);
  const [otevreny, setOtevreny] = useState<number | null>(null);
  const [formular, setFormular] = useState(false);
  const [novy, setNovy] = useState<string | null>(null);
  const [zkopirovano, setZkopirovano] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch("/api/apiklice", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setChyba(d?.error ?? "Načtení selhalo."); return; }
      setKlice(d.klice ?? []);
      setChyba(null);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }, []);

  useEffect(() => { nacti(); }, [nacti]);

  /**
   * Výměna. Starý klíč ještě den funguje, takže web nespadne
   * ve chvíli, kdy nikdo není u počítače.
   */
  async function vymen(k: Klic) {
    if (!confirm(`Vyměnit klíč „${k.nazev}"? Starý bude fungovat ještě 24 hodin.`)) return;
    const r = await fetch("/api/apiklice/vymena", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: k.id }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) { setChyba(d?.error ?? "Výměna selhala."); return; }
    setOtevreny(null);
    setNovy(d.klic);
  }

  async function odvolej(k: Klic) {
    if (!confirm(`Odvolat klíč „${k.nazev}"? Web, který ho používá, okamžitě přestane fungovat.`)) return;
    await fetch(`/api/apiklice?id=${k.id}`, { method: "DELETE" }).catch(() => undefined);
    setOtevreny(null);
    nacti();
  }

  // Okamžik odhalení má vlastní obrazovku — nesmí zmizet omylem.
  if (novy) {
    return (
      <div className="kl-odhaleni">
        <p className="data kl-odhaleni__k">KLÍČ VYTVOŘEN</p>
        <p className="kl-odhaleni__n">Zkopíruj si ho teď</p>
        <p className="kl-odhaleni__p">
          Ukládá se jen jeho otisk, ne on sám. Až tuhle obrazovku zavřeš,
          nikdo ho už neuvidí — ani já, ani ty.
        </p>

        <div className="kl-hodnota">
          <code>{novy}</code>
          <button
            className={`kl-kopie ${zkopirovano ? "kl-kopie--hotovo" : ""}`}
            onClick={() => {
              navigator.clipboard?.writeText(novy).catch(() => undefined);
              setZkopirovano(true);
            }}
          >
            <i className={`ti ti-${zkopirovano ? "check" : "copy"}`} aria-hidden="true" />
            {zkopirovano ? "Zkopírováno" : "Kopírovat"}
          </button>
        </div>

        <div className="adm-alert adm-alert--warn" style={{ marginTop: 14 }}>
          <span className="adm-alert__text">
            <span className="adm-alert__title">Vlož ho do proměnné prostředí, ne do kódu stránky.</span>{" "}
            <span className="adm-alert__detail">
              Klíč v kódu si přečte kdokoli, kdo si otevře zdroj.
            </span>
          </span>
        </div>

        <div className="adm-actions">
          <button
            className="adm-btn adm-btn--primary"
            onClick={() => { setNovy(null); setZkopirovano(false); nacti(); }}
          >
            <i className="ti ti-check" aria-hidden="true" />
            Mám ho uložený
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {chyba && (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text">
            <span className="adm-alert__title">{chyba}</span>{" "}
            <span className="adm-alert__detail">Spustil jsi supabase/apiklice.sql?</span>
          </span>
        </div>
      )}

      <div className="adm-actions" style={{ marginTop: 0 }}>
        <button className="adm-btn adm-btn--primary" onClick={() => setFormular(true)}>
          <i className="ti ti-plus" aria-hidden="true" />
          Vytvořit klíč
        </button>
        <a className="adm-btn" href="/dashboard/apiklice/dokumentace">
          <i className="ti ti-book" aria-hidden="true" />
          Dokumentace pro web
        </a>
        <a className="adm-btn" href="/dashboard/apiklice/protokol">
          <i className="ti ti-list-search" aria-hidden="true" />
          Protokol volání
        </a>
      </div>

      {klice.length === 0 ? (
        <div className="tz-skupina">
          <p className="adm-panel__lead" style={{ margin: 0 }}>
            Zatím žádný klíč. Vytvoř první tlačítkem nahoře.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          {klice.map((k) => {
            const stav = stavKlice(k);
            const barva = BARVY_STAVU[stav];
            const je = otevreny === k.id;
            const max = Math.max(...k.graf, 1);

            return (
              <div key={k.id} className={`kl-radek ${je ? "kl-radek--on" : ""} ${stav === "odvolany" ? "kl-radek--mrtvy" : ""}`}>
                <button className="kl-hlavicka" onClick={() => setOtevreny(je ? null : k.id)}>
                  <span className="kl-znak" style={{ color: barva, background: `${barva}1a` }}>
                    <i className={`ti ti-${stav === "odvolany" ? "key-off" : "key"}`} aria-hidden="true" />
                  </span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="kl-nazev">
                      {k.nazev}
                      {k.druh === "test" && <span className="kl-test">TEST</span>}
                    </span>
                    <span className="data kl-otisk">{k.nahled}</span>
                    <span className="kl-meta">
                      <span>vytvořen {den(k.created_at)}</span>
                      <span>použit {den(k.posledni_pouziti)}</span>
                      {k.dnes > 0 && <span style={{ color: "#7ef0a8" }}>dnes {k.dnes} volání</span>}
                      {k.chyb > 0 && <span style={{ color: "#ff8a8a" }}>{k.chyb} chyb</span>}
                    </span>
                  </span>

                  <span className="kl-stav" style={{ background: `${barva}1f`, color: barva }}>
                    <span className={`kl-tecka ${stav === "aktivni" ? "kl-tecka--zive" : ""}`}
                          style={{ background: barva }} />
                    {NAZVY_STAVU[stav]}
                  </span>
                </button>

                {je && (
                  <div className="kl-detail">
                    <p className="data kl-sekce">CO KLÍČ SMÍ</p>
                    <div className="kl-opravneni">
                      {k.opravneni.length === 0 ? (
                        <span className="kl-popis">Klíč je odvolaný, nesmí nic.</span>
                      ) : k.opravneni.map((o) => {
                        const def = OPRAVNENI[o as Opravneni];
                        return (
                          <span key={o} className={`kl-opr ${def?.zapis ? "kl-opr--zapis" : ""}`}>
                            <i className={`ti ti-${def?.zapis ? "pencil" : "eye"}`} aria-hidden="true" />
                            {o}
                          </span>
                        );
                      })}
                    </div>

                    <p className="data kl-sekce">OMEZENÍ</p>
                    <div className="kl-udaj">
                      <span className="data">DOMÉNA</span>
                      <span>
                        {k.domeny.length ? k.domeny.join(", ") : (
                          <span style={{ color: "#ffc94a" }}>
                            Bez omezení — klíč funguje odkudkoli
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="kl-udaj">
                      <span className="data">IP ADRESY</span>
                      <span>
                        {k.ip_seznam?.length ? k.ip_seznam.join(", ") : (
                          <span style={{ color: "#ffc94a" }}>
                            Bez omezení — doménu jde podvrhnout, adresu ne
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="kl-udaj">
                      <span className="data">LIMIT</span>
                      <span>{k.limit_hod} volání za hodinu</span>
                    </div>
                    {k.dobehne_do && (
                      <div className="kl-udaj">
                        <span className="data">DOBĚH</span>
                        <span style={{ color: "#ffc94a" }}>
                          vyměněn, funguje do {new Date(k.dobehne_do).toLocaleString("cs-CZ")}
                        </span>
                      </div>
                    )}
                    <div className="kl-udaj">
                      <span className="data">PLATNOST</span>
                      <span>{k.plati_do ? `do ${den(k.plati_do)}` : "bez omezení"}</span>
                    </div>

                    {stav !== "odvolany" && (
                      <>
                        <p className="data kl-sekce">POSLEDNÍCH SEDM DNÍ</p>
                        <div className="kl-graf">
                          {k.graf.map((v, i) => (
                            <span key={i} style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
                                  title={`${v} volání`} />
                          ))}
                        </div>
                      </>
                    )}

                    <p className="data kl-sekce">CO KLÍČ NIKDY NEUMOŽNÍ</p>
                    {NIKDY.map((n, i) => (
                      <div key={i} className="kl-nesmi">
                        <i className="ti ti-x" aria-hidden="true" />
                        <span>{n}</span>
                      </div>
                    ))}

                    {stav !== "odvolany" && (
                      <div className="adm-actions">
                        <button className="adm-btn" onClick={() => vymen(k)}>
                          <i className="ti ti-refresh" aria-hidden="true" />
                          Vyměnit bez výpadku
                        </button>
                        <button className="adm-btn" onClick={() => odvolej(k)}
                                style={{ borderColor: "rgba(255,107,107,0.24)", color: "#ff8a8a",
                                         marginLeft: "auto" }}>
                          <i className="ti ti-ban" aria-hidden="true" />
                          Odvolat hned
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formular && (
        <FormularKlice
          onZavri={() => setFormular(false)}
          onVytvoreno={(k) => { setFormular(false); setNovy(k); }}
        />
      )}
    </>
  );
}

function FormularKlice({
  onZavri, onVytvoreno,
}: { onZavri: () => void; onVytvoreno: (klic: string) => void }) {
  const [nazev, setNazev] = useState("");
  const [druh, setDruh] = useState<"live" | "test">("live");
  const [vybrana, setVybrana] = useState<Opravneni[]>([]);
  const [domeny, setDomeny] = useState("");
  const [ip, setIp] = useState("");
  const [limit, setLimit] = useState("600");
  const [bezi, setBezi] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  async function uloz() {
    if (!nazev.trim()) { setChyba("Vyplň název."); return; }
    if (vybrana.length === 0) { setChyba("Vyber aspoň jedno oprávnění."); return; }

    setBezi(true);
    setChyba(null);
    try {
      const r = await fetch("/api/apiklice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nazev, druh, opravneni: vybrana,
          domeny: domeny.split(",").map((d) => d.trim()).filter(Boolean),
          ip_seznam: ip.split(",").map((x) => x.trim()).filter(Boolean),
          limit_hod: Number(limit) || 600,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Vytvoření selhalo.");
      else onVytvoreno(d.klic);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setBezi(false);
  }

  return (
    <>
      <div className="cl-scrim" onClick={onZavri} />
      <aside className="cl-panel" role="dialog" aria-label="Nový klíč">
        <div className="cl-panel__top">
          <span style={{ flex: 1 }}>
            <span className="cl-panel__name">Nový API klíč</span>
            <span className="data cl-panel__id">ukáže se jednou</span>
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
          <input className="set-input" value={nazev} onChange={(e) => setNazev(e.target.value)}
                 placeholder="bet-imperium.cz" autoFocus />
        </label>

        <label className="set-pole">
          <span className="set-label">Prostředí</span>
          <select className="set-input" value={druh}
                  onChange={(e) => setDruh(e.target.value as "live" | "test")}>
            <option value="live">Ostrý provoz</option>
            <option value="test">Testovací — nezapisuje do ostrých dat</option>
          </select>
        </label>

        <div className="set-pole">
          <span className="set-label">Oprávnění</span>
          {VSECHNA_OPRAVNENI.map((o) => {
            const def = OPRAVNENI[o];
            const je = vybrana.includes(o);
            return (
              <button
                key={o}
                className={`kl-volba ${je ? "kl-volba--on" : ""}`}
                onClick={() => setVybrana((s) => je ? s.filter((x) => x !== o) : [...s, o])}
                aria-pressed={je}
              >
                <i className={`ti ti-${def.zapis ? "pencil" : "eye"}`}
                   style={{ color: def.zapis ? "#ffc94a" : "#7ef0a8" }} aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="kl-volba__n">{def.nazev}</span>
                  <span className="kl-volba__p">{def.popis}</span>
                </span>
                {je && <i className="ti ti-check" style={{ color: "#7ef0a8" }} aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {maZapis(vybrana) && (
          <p className="adm-todo__note" style={{ color: "#d9b96a" }}>
            Klíč bude umět zapisovat. Omez ho doménou, ať ho nejde použít odjinud.
          </p>
        )}

        <label className="set-pole">
          <span className="set-label">Povolené domény</span>
          <input className="set-input" value={domeny} onChange={(e) => setDomeny(e.target.value)}
                 placeholder="www.bet-imperium.cz, *.vercel.app" />
        </label>
        <p className="adm-todo__note" style={{ marginTop: 0 }}>
          Oddělené čárkou. Prázdné pole znamená, že klíč funguje odkudkoli —
          u zápisových oprávnění se to nedoporučuje.
        </p>

        <label className="set-pole">
          <span className="set-label">Povolené IP adresy</span>
          <input className="set-input" value={ip} onChange={(e) => setIp(e.target.value)}
                 placeholder="76.76.21.0/24, 81.2.3.4" />
        </label>
        <p className="adm-todo__note" style={{ marginTop: 0 }}>
          Silnější pojistka než doména — tu si volající nastaví sám, adresu ne.
          Vercel má pevné odchozí rozsahy, dají se zadat.
        </p>

        <label className="set-pole">
          <span className="set-label">Limit za hodinu</span>
          <input className="set-input" type="number" inputMode="numeric"
                 value={limit} onChange={(e) => setLimit(e.target.value)} />
        </label>

        <div className="adm-actions">
          <button className="adm-btn adm-btn--primary" onClick={uloz} disabled={bezi}>
            {bezi ? "Vytvářím…" : "Vytvořit klíč"}
          </button>
          <button className="adm-btn" onClick={onZavri}>Zrušit</button>
        </div>
      </aside>
    </>
  );
}
