"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Doklad, { type Faktura, type Udaje } from "./Doklad";
import FormularFaktury from "./FormularFaktury";
import { STAVY, poSplatnosti, prumernaDobaPlaceni, souhrn, kc, type Stav } from "@/lib/faktury/stav";
import { UROVNE, mailto, type Uroven } from "@/lib/faktury/upominky";

/**
 * Faktury.
 *
 * Vystavená faktura je daňový doklad — nedá se upravit ani smazat,
 * jen stornovat. Řada čísel nesmí mít mezery.
 */

type Upominka = { faktura_id: number; uroven: string; odeslano_at: string; odeslal_jmeno: string | null };
type Klient = { id: string; name: string };

const den = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("cs-CZ") : "—");

export default function FakturyPanel({ jeSpravce }: { jeSpravce: boolean }) {
  const [faktury, setFaktury] = useState<Faktura[]>([]);
  const [upominky, setUpominky] = useState<Upominka[]>([]);
  const [udaje, setUdaje] = useState<Udaje | null>(null);
  const [klienti, setKlienti] = useState<Klient[]>([]);
  const [otevrena, setOtevrena] = useState<Faktura | null>(null);
  const [formular, setFormular] = useState(false);
  const [filtr, setFiltr] = useState<"vse" | "ceka" | "poSplatnosti" | "zaplacene">("vse");
  const [hledat, setHledat] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch("/api/faktury", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setChyba(d?.error ?? "Načtení selhalo."); return; }
      setFaktury(d.faktury ?? []);
      setUpominky(d.upominky ?? []);
      setUdaje(d.udaje);
      setKlienti(d.klienti ?? []);
      setChyba(null);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }, []);

  useEffect(() => { nacti(); }, [nacti]);

  const s = useMemo(() => souhrn(faktury), [faktury]);
  const prumer = useMemo(() => prumernaDobaPlaceni(faktury), [faktury]);

  const videt = useMemo(() => {
    let v = faktury;
    if (filtr === "ceka") v = v.filter((f) => f.stav === "vystavena");
    else if (filtr === "poSplatnosti") v = v.filter((f) => poSplatnosti(f) > 0);
    else if (filtr === "zaplacene") v = v.filter((f) => f.stav === "zaplacena");

    const t = hledat.trim().toLowerCase();
    return t
      ? v.filter((f) => [f.cislo, f.odberatel, f.odberatel_ico].some((x) => x?.toLowerCase().includes(t)))
      : v;
  }, [faktury, filtr, hledat]);

  /** Dlužníci seřazení podle částky — na koho zatlačit první. */
  const dluznici = useMemo(() => {
    const m = new Map<string, { castka: number; pocet: number; nejstarsi: number }>();
    for (const f of faktury) {
      const dni = poSplatnosti(f);
      if (dni === 0) continue;
      const d = m.get(f.odberatel) ?? { castka: 0, pocet: 0, nejstarsi: 0 };
      d.castka += Number(f.castka);
      d.pocet++;
      d.nejstarsi = Math.max(d.nejstarsi, dni);
      m.set(f.odberatel, d);
    }
    return [...m.entries()].sort((a, b) => b[1].castka - a[1].castka);
  }, [faktury]);

  async function zmenStav(f: Faktura, stav: string) {
    const r = await fetch("/api/faktury", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id, stav }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setChyba(d?.error ?? "Změna selhala.");
    }
    setOtevrena(null);
    nacti();
  }

  async function posliUpominku(f: Faktura, u: Uroven) {
    if (!f.odberatel_email) {
      setChyba("Odběratel nemá e-mail. Doplň ho v úpravě faktury.");
      return;
    }
    const dni = poSplatnosti(f);
    window.location.href = mailto(f.odberatel_email, u, {
      cislo: f.cislo,
      odberatel: f.odberatel,
      castka: kc(Number(f.castka)),
      splatnost: den(f.splatnost),
      dni,
      firma: udaje?.nazev ?? "BETIMPERIUM s.r.o.",
      ucet: udaje?.ucet ?? undefined,
      vs: f.vs ?? undefined,
    });

    await fetch("/api/faktury/upominka", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faktura_id: f.id, uroven: u }),
    }).catch(() => undefined);
    nacti();
  }

  async function smaz(f: Faktura) {
    if (!confirm(`Smazat koncept ${f.cislo}?`)) return;
    const r = await fetch(`/api/faktury?id=${f.id}`, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setChyba(d?.error ?? "Smazání selhalo.");
    }
    setOtevrena(null);
    nacti();
  }

  const upominkyK = (id: number) => upominky.filter((u) => u.faktura_id === id);

  return (
    <>
      {chyba && (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text">
            <span className="adm-alert__title">{chyba}</span>{" "}
            <span className="adm-alert__detail">Spustil jsi supabase/faktury.sql?</span>
          </span>
        </div>
      )}

      {!udaje?.ucet && (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Chybí číslo účtu.</span>{" "}
            <span className="adm-alert__detail">
              Bez něj se na fakturách neobjeví QR platba. Doplň ho v Nastavení.
            </span>
          </span>
        </div>
      )}

      <div className="adm-cards">
        <div className="tz-kpi">
          <p className="tz-kpi__k">ZAPLACENO</p>
          <p className="tz-kpi__n" style={{ fontSize: 18, color: "#7ef0a8" }}>{kc(s.zaplaceno)}</p>
        </div>
        <div className="tz-kpi">
          <p className="tz-kpi__k">ČEKÁ NA ÚHRADU</p>
          <p className="tz-kpi__n" style={{ fontSize: 18, color: "#dff5e8" }}>{kc(s.ceka)}</p>
        </div>
        <div className={`tz-kpi ${s.pocetPoSplatnosti > 0 ? "tz-kpi--warn" : ""}`}>
          <p className="tz-kpi__k">PO SPLATNOSTI</p>
          <p className="tz-kpi__n" style={{ fontSize: 18, color: s.pocetPoSplatnosti ? "#ffc94a" : "#dff5e8" }}>
            {kc(s.poSplatnosti)}
          </p>
        </div>
        <div className="tz-kpi">
          <p className="tz-kpi__k">PRŮMĚRNĚ PLATÍ ZA</p>
          <p className="tz-kpi__n" style={{ fontSize: 18, color: "#dff5e8" }}>
            {prumer === null ? "—" : `${prumer} dní`}
          </p>
        </div>
      </div>

      <div className="adm-actions">
        <button className="adm-btn adm-btn--primary" onClick={() => setFormular(true)}>
          <i className="ti ti-plus" aria-hidden="true" />
          Nová faktura
        </button>
        <label className="tz-hledat">
          <i className="ti ti-search" aria-hidden="true" />
          <input value={hledat} onChange={(e) => setHledat(e.target.value)}
                 placeholder="Číslo, odběratel, IČO…" aria-label="Hledat fakturu" />
        </label>
      </div>

      <div className="vz-zalozky">
        {([
          ["vse", `Vše (${faktury.length})`],
          ["ceka", `Čeká (${faktury.filter((f) => f.stav === "vystavena").length})`],
          ["poSplatnosti", `Po splatnosti (${s.pocetPoSplatnosti})`],
          ["zaplacene", `Zaplacené (${faktury.filter((f) => f.stav === "zaplacena").length})`],
        ] as const).map(([k, n]) => (
          <button
            key={k}
            className={`vz-zalozka ${filtr === k ? "vz-zalozka--on" : ""}`}
            onClick={() => setFiltr(k)}
          >
            {n}
          </button>
        ))}
      </div>

      {dluznici.length > 0 && filtr === "poSplatnosti" && (
        <div className="tz-skupina">
          <p className="tz-nadpis">
            <span className="tz-ikona"><i className="ti ti-alert-triangle" aria-hidden="true" /></span>
            Kdo dluží
            <span className="tz-pocet">SEŘAZENO PODLE ČÁSTKY</span>
          </p>
          <div style={{ marginTop: 8 }}>
            {dluznici.map(([jmeno, d]) => (
              <div key={jmeno} className="fa-dluznik">
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="fa-dluznik__jmeno">{jmeno}</span>
                  <span className="vz-meta">
                    <span>{d.pocet} {d.pocet === 1 ? "faktura" : d.pocet < 5 ? "faktury" : "faktur"}</span>
                    <span style={{ color: "#ffc94a" }}>nejstarší {d.nejstarsi} dní</span>
                  </span>
                </span>
                <span className="data fa-dluznik__castka">{kc(d.castka)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="scroll-x" style={{ marginTop: 14 }}>
        <table className="fa-tab">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Číslo</th>
              <th style={{ textAlign: "left" }}>Odběratel</th>
              <th>Vystaveno</th>
              <th>Splatnost</th>
              <th>Částka</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            {videt.map((f) => {
              const dni = poSplatnosti(f);
              const st = STAVY[f.stav as Stav] ?? STAVY.koncept;
              const u = upominkyK(f.id);
              return (
                <tr key={f.id} className="fa-radek" onClick={() => setOtevrena(f)}>
                  <td style={{ textAlign: "left" }} className="data fa-cislo">{f.cislo}</td>
                  <td style={{ textAlign: "left" }}>
                    <span className="fa-odberatel">{f.odberatel}</span>
                    {u.length > 0 && (
                      <span className="fa-upominky" title={`${u.length} upomínek`}>
                        <i className="ti ti-bell" aria-hidden="true" />{u.length}
                      </span>
                    )}
                  </td>
                  <td className="data">{den(f.vystaveno)}</td>
                  <td className="data" style={{ color: dni > 0 ? "#ff8a8a" : undefined }}>
                    {den(f.splatnost)}
                    {dni > 0 && <span className="fa-dni"> +{dni}</span>}
                  </td>
                  <td className="data fa-castka">{kc(Number(f.castka))}</td>
                  <td>
                    <span className="fa-stav" style={{ color: st.barva, background: `${st.barva}1a` }}>
                      {st.nazev}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {videt.length === 0 && (
        <div className="tz-skupina">
          <p className="adm-panel__lead" style={{ margin: 0 }}>
            {faktury.length === 0
              ? "Zatím žádné faktury. Vystav první tlačítkem nahoře."
              : "Nic neodpovídá filtru."}
          </p>
        </div>
      )}

      {otevrena && (
        <>
          <div className="pv-scrim" onClick={() => setOtevrena(null)} />
          <div className="pv" role="dialog" aria-label={`Faktura ${otevrena.cislo}`}>
            <div className="pv__hlava">
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="pv__nazev">Faktura {otevrena.cislo}</span>
                <span className="data pv__meta">{otevrena.odberatel}</span>
              </span>

              {otevrena.stav === "vystavena" && (
                <>
                  <button className="adm-btn" onClick={() => zmenStav(otevrena, "zaplacena")}>
                    <i className="ti ti-check" aria-hidden="true" />
                    Zaplaceno
                  </button>
                  {poSplatnosti(otevrena) > 0 && (
                    <span className="fa-upominka-menu">
                      <button className="adm-btn">
                        <i className="ti ti-bell" aria-hidden="true" />
                        Upomínka
                      </button>
                      <span className="fa-upominka-volby">
                        {(Object.keys(UROVNE) as Uroven[]).map((u) => (
                          <button key={u} onClick={() => posliUpominku(otevrena, u)}>
                            <span style={{ color: UROVNE[u].barva }}>{UROVNE[u].nazev}</span>
                            <span>{UROVNE[u].popis}</span>
                          </button>
                        ))}
                      </span>
                    </span>
                  )}
                </>
              )}
              {otevrena.stav === "koncept" && (
                <>
                  <button className="adm-btn adm-btn--primary" onClick={() => zmenStav(otevrena, "vystavena")}>
                    <i className="ti ti-send" aria-hidden="true" />
                    Vystavit
                  </button>
                  <button className="tz-btn tz-btn--zla" onClick={() => smaz(otevrena)} aria-label="Smazat">
                    <i className="ti ti-trash" aria-hidden="true" />
                  </button>
                </>
              )}
              <button className="adm-btn" onClick={() => window.print()}>
                <i className="ti ti-printer" aria-hidden="true" />
                Tisk
              </button>
              <button className="tap cl-close" onClick={() => setOtevrena(null)} aria-label="Zavřít">
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>

            <div className="pv__telo">
              {upominkyK(otevrena.id).length > 0 && (
                <div className="adm-alert adm-alert--warn">
                  <span className="adm-alert__text">
                    <span className="adm-alert__title">Odeslané upomínky:</span>{" "}
                    <span className="adm-alert__detail">
                      {upominkyK(otevrena.id).map((u) =>
                        `${UROVNE[u.uroven as Uroven]?.nazev ?? u.uroven} (${den(u.odeslano_at)})`
                      ).join(" · ")}
                    </span>
                  </span>
                </div>
              )}
              <Doklad f={otevrena} udaje={udaje} />
            </div>
          </div>
        </>
      )}

      {formular && (
        <FormularFaktury
          klienti={klienti}
          platceDph={udaje?.platce_dph ?? false}
          onZavri={() => setFormular(false)}
          onUlozeno={() => { setFormular(false); nacti(); }}
        />
      )}
    </>
  );
}
