"use client";

import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import {
  STAVY, PALIVA, DRUHY_SERVISU, ZAVAZNOSTI, naleha, zbyva, BARVA_LHUTY, ujeto, type Stav,
} from "@/lib/vozidla/lhuty";
import type { Vozidlo, Karta, Clovek } from "./VozovyPark";

/**
 * Karta vozidla.
 *
 * Vše k autu na jednom místě: doklady a lhůty, kniha jízd, servis
 * a fotodokumentace poškození.
 */

type Jizda = {
  id: number; datum: string; ucel: string; odkud: string | null; kam: string | null;
  km_start: number; km_cil: number; soukroma: boolean; ridic_jmeno: string | null;
};
type Oprava = {
  id: number; datum: string; druh: string; popis: string;
  tachometr: number | null; cena: number | null; dodavatel: string | null;
};
type Skoda = {
  id: number; datum: string; misto: string; popis: string | null;
  zavaznost: string; vyreseno: boolean; fotky: number[]; nahlasil_jmeno: string | null;
};

const den = (iso: string) => new Date(iso).toLocaleDateString("cs-CZ");

export default function DetailVozidla({
  vozidlo, karty, lide, smiSpravovat, jaId, onZavri, onZmena, onSmazat,
}: {
  vozidlo: Vozidlo;
  karty: Karta[];
  lide: Clovek[];
  smiSpravovat: boolean;
  jaId: string;
  onZavri: () => void;
  onZmena: () => void;
  onSmazat: () => void;
}) {
  const [zalozka, setZalozka] = useState<"doklady" | "jizdy" | "servis" | "poskozeni">("doklady");
  const [jizdy, setJizdy] = useState<Jizda[]>([]);
  const [servis, setServis] = useState<Oprava[]>([]);
  const [skody, setSkody] = useState<Skoda[]>([]);
  const [pridat, setPridat] = useState<null | "jizda" | "servis" | "poskozeni">(null);
  const [chyba, setChyba] = useState<string | null>(null);

  const mujVuz = vozidlo.ridic === jaId;
  const smiZapsat = smiSpravovat || mujVuz;

  const nacti = useCallback(async () => {
    try {
      const r = await fetch(`/api/vozidla/detail?id=${vozidlo.id}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setChyba(d?.error ?? "Načtení selhalo."); return; }
      setJizdy(d.jizdy ?? []);
      setServis(d.servis ?? []);
      setSkody(d.poskozeni ?? []);
      setChyba(null);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }, [vozidlo.id]);

  useEffect(() => { nacti(); }, [nacti]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onZavri();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onZavri]);

  const s = STAVY[vozidlo.stav as Stav] ?? STAVY.aktivni;
  const celkemKm = jizdy.reduce((a, j) => a + ujeto(j.km_start, j.km_cil), 0);
  const sluzebni = jizdy.filter((j) => !j.soukroma).reduce((a, j) => a + ujeto(j.km_start, j.km_cil), 0);
  const nevyresene = skody.filter((x) => !x.vyreseno).length;

  const LHUTY: [string, string | null, string][] = [
    ["Technická kontrola", vozidlo.stk_do, "settings"],
    ["Pojištění", vozidlo.pojisteni_do, "shield"],
    ["Dálniční známka", vozidlo.znamka_do, "road"],
    ["Servisní prohlídka", vozidlo.servis_do, "tool"],
  ];

  return (
    <>
      <div className="pv-scrim" onClick={onZavri} />
      <div className="pv" role="dialog" aria-label={`Vozidlo ${vozidlo.spz}`}>
        <div className="pv__hlava">
          <span className="vz-d-znak">
            <i className="ti ti-car" aria-hidden="true" />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="vz-d-nazev">
              {vozidlo.znacka} {vozidlo.model ?? ""}
              <span className="data vz-d-spz">{vozidlo.spz}</span>
            </span>
            <span className="vz-meta">
              <span style={{ color: s.barva }}>{s.nazev}</span>
              <span>{vozidlo.tachometr.toLocaleString("cs-CZ")} km</span>
              {vozidlo.palivo && <span>{PALIVA[vozidlo.palivo]}</span>}
              {vozidlo.rok && <span>{vozidlo.rok}</span>}
            </span>
          </span>
          {smiSpravovat && (
            <button className="tz-btn tz-btn--zla" onClick={onSmazat} aria-label="Smazat vozidlo">
              <i className="ti ti-trash" aria-hidden="true" />
            </button>
          )}
          <button className="tap cl-close" onClick={onZavri} aria-label="Zavřít">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className="vz-d-zalozky">
          {([
            ["doklady", "Doklady a lhůty", "file-certificate"],
            ["jizdy", `Kniha jízd${jizdy.length ? ` (${jizdy.length})` : ""}`, "route"],
            ["servis", `Servis${servis.length ? ` (${servis.length})` : ""}`, "tool"],
            ["poskozeni", `Poškození${nevyresene ? ` (${nevyresene})` : ""}`, "alert-triangle"],
          ] as const).map(([k, n, i]) => (
            <button
              key={k}
              className={`vz-d-zalozka ${zalozka === k ? "vz-d-zalozka--on" : ""}`}
              onClick={() => setZalozka(k)}
            >
              <i className={`ti ti-${i}`} aria-hidden="true" />
              {n}
            </button>
          ))}
        </div>

        <div className="pv__telo">
          {chyba && (
            <div className="adm-alert adm-alert--bad">
              <span className="adm-alert__text"><span className="adm-alert__title">{chyba}</span></span>
            </div>
          )}

          {zalozka === "doklady" && (
            <>
              <div className="vz-lhuty">
                {LHUTY.map(([nazev, datum, ikona]) => {
                  const n = naleha(datum);
                  return (
                    <div key={nazev} className="vz-lhuta-karta" style={{ borderColor: `${BARVA_LHUTY[n]}30` }}>
                      <span className="vz-lhuta-ikona" style={{ background: `${BARVA_LHUTY[n]}1a`, color: BARVA_LHUTY[n] }}>
                        <i className={`ti ti-${ikona}`} aria-hidden="true" />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="vz-lhuta-nazev">{nazev}</span>
                        <span className="data vz-lhuta-datum" style={{ color: BARVA_LHUTY[n] }}>
                          {datum ? `${den(datum)} · ${zbyva(datum)}` : "nezadáno"}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="vz-udaje">
                {vozidlo.vin && <Udaj popisek="VIN" hodnota={vozidlo.vin} />}
                {vozidlo.barva && <Udaj popisek="Barva" hodnota={vozidlo.barva} />}
                <Udaj popisek="Řidič" hodnota={vozidlo.ridic_jmeno ?? "nepřiřazen"} />
                <Udaj popisek="Ujeto celkem" hodnota={`${celkemKm.toLocaleString("cs-CZ")} km`} />
                <Udaj popisek="Z toho služebně" hodnota={`${sluzebni.toLocaleString("cs-CZ")} km`} />
              </div>

              {karty.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p className="data vz-nadpis">TANKOVACÍ KARTY</p>
                  {karty.map((k) => (
                    <div key={k.id} className="vz-radek">
                      <i className="ti ti-credit-card" style={{ color: "#7ef0a8" }} aria-hidden="true" />
                      <span className="data" style={{ flex: 1 }}>{k.cislo}</span>
                      {k.platnost_do && (
                        <span className="data" style={{ fontSize: 10.5, color: BARVA_LHUTY[naleha(k.platnost_do)] }}>
                          {zbyva(k.platnost_do)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {vozidlo.poznamka && (
                <p className="vz-poznamka">{vozidlo.poznamka}</p>
              )}
            </>
          )}

          {zalozka === "jizdy" && (
            <>
              {smiZapsat && (
                <button className="adm-btn adm-btn--primary" onClick={() => setPridat("jizda")}>
                  <i className="ti ti-plus" aria-hidden="true" />
                  Zapsat jízdu
                </button>
              )}
              <div style={{ marginTop: 12 }}>
                {jizdy.length === 0 ? (
                  <p className="kal__prazdno">Zatím žádné jízdy.</p>
                ) : (
                  jizdy.map((j) => (
                    <div key={j.id} className="vz-radek">
                      <span className="data vz-datum">{den(j.datum)}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="vz-ucel">
                          {j.ucel}
                          {j.soukroma && <span className="vz-soukroma">soukromá</span>}
                        </span>
                        <span className="vz-meta">
                          {(j.odkud || j.kam) && <span>{j.odkud ?? "?"} → {j.kam ?? "?"}</span>}
                          {j.ridic_jmeno && <span>{j.ridic_jmeno}</span>}
                        </span>
                      </span>
                      <span className="data vz-km">{ujeto(j.km_start, j.km_cil).toLocaleString("cs-CZ")} km</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {zalozka === "servis" && (
            <>
              {smiSpravovat && (
                <button className="adm-btn adm-btn--primary" onClick={() => setPridat("servis")}>
                  <i className="ti ti-plus" aria-hidden="true" />
                  Zapsat servis
                </button>
              )}
              <div style={{ marginTop: 12 }}>
                {servis.length === 0 ? (
                  <p className="kal__prazdno">Zatím žádný záznam.</p>
                ) : (
                  servis.map((o) => (
                    <div key={o.id} className="vz-radek">
                      <span className="data vz-datum">{den(o.datum)}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="vz-ucel">{DRUHY_SERVISU[o.druh] ?? o.druh}</span>
                        <span className="vz-meta">
                          <span>{o.popis}</span>
                          {o.dodavatel && <span>{o.dodavatel}</span>}
                          {o.tachometr && <span>{o.tachometr.toLocaleString("cs-CZ")} km</span>}
                        </span>
                      </span>
                      {o.cena !== null && (
                        <span className="data vz-km">{Number(o.cena).toLocaleString("cs-CZ")} Kč</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {zalozka === "poskozeni" && (
            <>
              {smiZapsat && (
                <button className="adm-btn adm-btn--primary" onClick={() => setPridat("poskozeni")}>
                  <i className="ti ti-plus" aria-hidden="true" />
                  Nahlásit poškození
                </button>
              )}
              <div style={{ marginTop: 12 }}>
                {skody.length === 0 ? (
                  <p className="kal__prazdno">Žádné poškození. To je dobře.</p>
                ) : (
                  skody.map((p) => {
                    const z = ZAVAZNOSTI[p.zavaznost] ?? ZAVAZNOSTI.drobne;
                    return (
                      <div key={p.id} className={`vz-radek ${p.vyreseno ? "vz-radek--hotovo" : ""}`}>
                        <span className="vz-skoda-znak" style={{ background: `${z.barva}1a`, color: z.barva }}>
                          <i className={`ti ti-${p.vyreseno ? "check" : "alert-triangle"}`} aria-hidden="true" />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="vz-ucel">{p.misto}</span>
                          <span className="vz-meta">
                            {p.popis && <span>{p.popis}</span>}
                            <span style={{ color: z.barva }}>{z.nazev}</span>
                            {p.nahlasil_jmeno && <span>{p.nahlasil_jmeno}</span>}
                            <span>{den(p.datum)}</span>
                            {p.fotky.length > 0 && <span>{p.fotky.length} fotek</span>}
                          </span>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {pridat && (
          <FormularZaznamu
            co={pridat}
            vozidlo={vozidlo}
            onZavri={() => setPridat(null)}
            onUlozeno={() => { setPridat(null); nacti(); onZmena(); }}
          />
        )}
      </div>
    </>
  );
}

function Udaj({ popisek, hodnota }: { popisek: string; hodnota: string }) {
  return (
    <span className="vz-udaj">
      <span className="vz-udaj__p">{popisek}</span>
      <span className="vz-udaj__h">{hodnota}</span>
    </span>
  );
}

/** Zápis jízdy, servisu nebo poškození. */
function FormularZaznamu({
  co, vozidlo, onZavri, onUlozeno,
}: {
  co: "jizda" | "servis" | "poskozeni";
  vozidlo: Vozidlo;
  onZavri: () => void;
  onUlozeno: () => void;
}) {
  const dnes = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<Record<string, string | boolean>>({
    datum: dnes,
    ucel: "", odkud: "", kam: "",
    km_start: String(vozidlo.tachometr), km_cil: "",
    soukroma: false,
    druh: "oprava", popis: "", tachometr: String(vozidlo.tachometr), cena: "", dodavatel: "",
    misto: "", zavaznost: "drobne",
  });
  const [bezi, setBezi] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const zmen = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  async function uloz() {
    setBezi(true);
    setChyba(null);
    try {
      const r = await fetch("/api/vozidla/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ co, vozidlo_id: vozidlo.id, ...f }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Uložení selhalo.");
      else onUlozeno();
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setBezi(false);
  }

  const nadpis = co === "jizda" ? "Zápis jízdy" : co === "servis" ? "Zápis servisu" : "Nahlášení poškození";

  return (
    <>
      <div className="cl-scrim" onClick={onZavri} style={{ zIndex: 160 }} />
      <aside className="cl-panel" role="dialog" aria-label={nadpis} style={{ zIndex: 161 }}>
        <div className="cl-panel__top">
          <span style={{ flex: 1 }}>
            <span className="cl-panel__name">{nadpis}</span>
            <span className="data cl-panel__id">{vozidlo.spz}</span>
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
          <span className="set-label">Datum</span>
          <input className="set-input" type="date" value={String(f.datum)}
                 onChange={(e) => zmen("datum", e.target.value)} />
        </label>

        {co === "jizda" && (
          <>
            <label className="set-pole">
              <span className="set-label">Účel cesty</span>
              <input className="set-input" value={String(f.ucel)}
                     onChange={(e) => zmen("ucel", e.target.value)}
                     placeholder="Schůzka s klientem" autoFocus />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="set-pole">
                <span className="set-label">Odkud</span>
                <input className="set-input" value={String(f.odkud)}
                       onChange={(e) => zmen("odkud", e.target.value)} placeholder="Brno" />
              </label>
              <label className="set-pole">
                <span className="set-label">Kam</span>
                <input className="set-input" value={String(f.kam)}
                       onChange={(e) => zmen("kam", e.target.value)} placeholder="Praha" />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="set-pole">
                <span className="set-label">Stav při odjezdu</span>
                <input className="set-input" type="number" inputMode="numeric" value={String(f.km_start)}
                       onChange={(e) => zmen("km_start", e.target.value)} />
              </label>
              <label className="set-pole">
                <span className="set-label">Stav při příjezdu</span>
                <input className="set-input" type="number" inputMode="numeric" value={String(f.km_cil)}
                       onChange={(e) => zmen("km_cil", e.target.value)} />
              </label>
            </div>
            {/* Rozdíl je vidět hned, ať se nepřepíše řád. */}
            {f.km_cil && Number(f.km_cil) >= Number(f.km_start) && (
              <p className="vz-vypocet">
                Ujeto {(Number(f.km_cil) - Number(f.km_start)).toLocaleString("cs-CZ")} km
              </p>
            )}
            <label className="vz-prepinac">
              <input type="checkbox" className="nt-prep" checked={Boolean(f.soukroma)}
                     onChange={(e) => zmen("soukroma", e.target.checked)} />
              Soukromá jízda
            </label>
          </>
        )}

        {co === "servis" && (
          <>
            <label className="set-pole">
              <span className="set-label">Druh</span>
              <select className="set-input" value={String(f.druh)} onChange={(e) => zmen("druh", e.target.value)}>
                {Object.entries(DRUHY_SERVISU).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="set-pole">
              <span className="set-label">Popis</span>
              <textarea className="set-input" rows={3} value={String(f.popis)}
                        onChange={(e) => zmen("popis", e.target.value)}
                        placeholder="Výměna oleje a filtrů" style={{ resize: "vertical" }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="set-pole">
                <span className="set-label">Stav tachometru</span>
                <input className="set-input" type="number" inputMode="numeric" value={String(f.tachometr)}
                       onChange={(e) => zmen("tachometr", e.target.value)} />
              </label>
              <label className="set-pole">
                <span className="set-label">Cena (Kč)</span>
                <input className="set-input" type="number" inputMode="decimal" value={String(f.cena)}
                       onChange={(e) => zmen("cena", e.target.value)} />
              </label>
            </div>
            <label className="set-pole">
              <span className="set-label">Dodavatel</span>
              <input className="set-input" value={String(f.dodavatel)}
                     onChange={(e) => zmen("dodavatel", e.target.value)} placeholder="Autoservis Novák" />
            </label>
          </>
        )}

        {co === "poskozeni" && (
          <>
            <label className="set-pole">
              <span className="set-label">Kde</span>
              <input className="set-input" value={String(f.misto)}
                     onChange={(e) => zmen("misto", e.target.value)}
                     placeholder="Levé přední dveře" autoFocus />
            </label>
            <label className="set-pole">
              <span className="set-label">Popis</span>
              <textarea className="set-input" rows={3} value={String(f.popis)}
                        onChange={(e) => zmen("popis", e.target.value)}
                        placeholder="Škrábanec asi 10 cm" style={{ resize: "vertical" }} />
            </label>
            <label className="set-pole">
              <span className="set-label">Závažnost</span>
              <select className="set-input" value={String(f.zavaznost)}
                      onChange={(e) => zmen("zavaznost", e.target.value)}>
                {Object.entries(ZAVAZNOSTI).map(([k, v]) => (
                  <option key={k} value={k}>{v.nazev}</option>
                ))}
              </select>
            </label>
          </>
        )}

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
