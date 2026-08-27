"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { mrizka, posunMesic, nazevMesice, cas, dnesIso, DNY } from "@/lib/kalendar/mesic";

/**
 * Dva kalendáře vedle sebe: firemní pro celý tým a osobní.
 *
 * Sdílejí jeden dotaz i jednu mřížku — rozdíl je jen ve filtru
 * a v barvě. Dva samostatné komponenty by znamenaly dvojí kód
 * i dvojí volání serveru.
 */

export type Udalost = {
  id: number;
  nazev: string;
  sdilena: boolean;
  datum: string;
  cas_od: string | null;
  cas_do: string | null;
  cely_den: boolean;
  misto: string | null;
  s_kym: string | null;
  barva: string;
  vlastnik: string;
};

const BARVY: Record<string, string> = {
  zelena: "#7ef0a8",
  jantar: "#ffc94a",
  modra: "#60a5fa",
  cervena: "#ff8a8a",
};

export default function Kalendare({ jaId }: { jaId: string }) {
  const dnes = dnesIso();
  const [rok, setRok] = useState(() => new Date().getFullYear());
  const [mesic, setMesic] = useState(() => new Date().getMonth());
  const [udalosti, setUdalosti] = useState<Udalost[]>([]);
  const [vybrany, setVybrany] = useState(dnes);
  const [formular, setFormular] = useState<null | boolean>(null); // true = firemní
  const [chyba, setChyba] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch(`/api/kalendar?rok=${rok}&mesic=${mesic}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Načtení selhalo.");
      else { setUdalosti(d.udalosti ?? []); setChyba(null); }
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }, [rok, mesic]);

  useEffect(() => { nacti(); }, [nacti]);

  const dny = useMemo(() => mrizka(rok, mesic, dnes), [rok, mesic, dnes]);

  function posun(o: number) {
    const p = posunMesic(rok, mesic, o);
    setRok(p.rok);
    setMesic(p.mesic);
  }

  async function smaz(id: number) {
    setUdalosti((u) => u.filter((x) => x.id !== id));
    await fetch(`/api/kalendar?id=${id}`, { method: "DELETE" }).catch(() => undefined);
    nacti();
  }

  function Kalendar({ sdilena }: { sdilena: boolean }) {
    const moje = udalosti.filter((u) => u.sdilena === sdilena);
    const naDen = (d: string) => moje.filter((u) => u.datum === d);
    const vybraneUdalosti = naDen(vybrany);
    const barva = sdilena ? "#60a5fa" : "#7ef0a8";

    return (
      <div className="kal">
        <div className="kal__hlava">
          <span className="kal__nazev">
            <span className="kal__tecka" style={{ background: barva }} />
            {sdilena ? "Firemní kalendář" : "Můj kalendář"}
          </span>
          <button
            className="kal__pridat tap"
            onClick={() => setFormular(sdilena)}
            aria-label={`Přidat do ${sdilena ? "firemního" : "mého"} kalendáře`}
          >
            <i className="ti ti-plus" aria-hidden="true" />
          </button>
        </div>

        <div className="kal__dny">
          {DNY.map((d) => <span key={d} className="kal__zkratka">{d}</span>)}
        </div>

        <div className="kal__mrizka">
          {dny.map((d) => {
            const ma = naDen(d.datum);
            return (
              <button
                key={d.datum}
                className={[
                  "kal__den",
                  d.jinyMesic ? "kal__den--jiny" : "",
                  d.dnes ? "kal__den--dnes" : "",
                  d.datum === vybrany ? "kal__den--vybrany" : "",
                ].join(" ")}
                onClick={() => setVybrany(d.datum)}
              >
                {d.cislo}
                {/* Tečka říká, že tam něco je, aniž by bylo potřeba klikat. */}
                {ma.length > 0 && (
                  <span className="kal__znacky">
                    {ma.slice(0, 3).map((u) => (
                      <span key={u.id} style={{ background: BARVY[u.barva] ?? barva }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="kal__seznam">
          {vybraneUdalosti.length === 0 ? (
            <p className="kal__prazdno">Na tenhle den tu nic není.</p>
          ) : (
            vybraneUdalosti.map((u) => (
              <div key={u.id} className="kal__udalost">
                <span className="kal__pruh" style={{ background: BARVY[u.barva] ?? barva }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="kal__u-nazev">{u.nazev}</span>
                  <span className="kal__u-meta">
                    {cas(u.cas_od, u.cas_do, u.cely_den) && <span>{cas(u.cas_od, u.cas_do, u.cely_den)}</span>}
                    {u.misto && <span>{u.misto}</span>}
                    {u.s_kym && <span>s {u.s_kym}</span>}
                  </span>
                </span>
                {(u.sdilena || u.vlastnik === jaId) && (
                  <button className="kal__smazat tap" onClick={() => smaz(u.id)} aria-label="Smazat">
                    <i className="ti ti-x" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="kal__ovladani">
        <button className="adm-btn" onClick={() => posun(-1)} aria-label="Předchozí měsíc">
          <i className="ti ti-chevron-left" aria-hidden="true" />
        </button>
        <span className="kal__mesic">{nazevMesice(rok, mesic)}</span>
        <button className="adm-btn" onClick={() => posun(1)} aria-label="Další měsíc">
          <i className="ti ti-chevron-right" aria-hidden="true" />
        </button>
        <button
          className="adm-btn"
          onClick={() => {
            const d = new Date();
            setRok(d.getFullYear()); setMesic(d.getMonth()); setVybrany(dnes);
          }}
        >
          Dnes
        </button>
      </div>

      {chyba && (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">{chyba}</span>{" "}
            <span className="adm-alert__detail">Spustil jsi supabase/kalendar.sql?</span>
          </span>
        </div>
      )}

      <div className="kal__pár">
        <Kalendar sdilena />
        <Kalendar sdilena={false} />
      </div>

      {formular !== null && (
        <FormularUdalosti
          sdilena={formular}
          datum={vybrany}
          onZavri={() => setFormular(null)}
          onUlozeno={() => { setFormular(null); nacti(); }}
        />
      )}
    </>
  );
}

function FormularUdalosti({
  sdilena, datum, onZavri, onUlozeno,
}: {
  sdilena: boolean; datum: string; onZavri: () => void; onUlozeno: () => void;
}) {
  const [nazev, setNazev] = useState("");
  const [den, setDen] = useState(datum);
  const [celyDen, setCelyDen] = useState(false);
  const [od, setOd] = useState("09:00");
  const [do_, setDo] = useState("10:00");
  const [misto, setMisto] = useState("");
  const [sKym, setSKym] = useState("");
  const [barva, setBarva] = useState(sdilena ? "modra" : "zelena");
  const [bezi, setBezi] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  async function uloz() {
    if (!nazev.trim()) { setChyba("Vyplň název."); return; }
    setBezi(true);
    setChyba(null);
    try {
      const r = await fetch("/api/kalendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nazev, sdilena, datum: den, cely_den: celyDen,
          cas_od: celyDen ? null : od, cas_do: celyDen ? null : do_,
          misto, s_kym: sKym, barva,
        }),
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
      <aside className="cl-panel" role="dialog" aria-label="Nová událost">
        <div className="cl-panel__top">
          <span style={{ flex: 1 }}>
            <span className="cl-panel__name">Nová událost</span>
            <span className="data cl-panel__id">
              {sdilena ? "firemní kalendář" : "můj kalendář"}
            </span>
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
                 placeholder="Schůzka s klientem" autoFocus />
        </label>

        <label className="set-pole">
          <span className="set-label">Datum</span>
          <input className="set-input" type="date" value={den} onChange={(e) => setDen(e.target.value)} />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 9, margin: "14px 0", cursor: "pointer", fontSize: 13.5, color: "#8fa396" }}>
          <input type="checkbox" checked={celyDen} onChange={(e) => setCelyDen(e.target.checked)}
                 style={{ width: 16, height: 16, accentColor: "#7ef0a8" }} />
          Celý den
        </label>

        {!celyDen && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label className="set-pole">
              <span className="set-label">Od</span>
              <input className="set-input" type="time" value={od} onChange={(e) => setOd(e.target.value)} />
            </label>
            <label className="set-pole">
              <span className="set-label">Do</span>
              <input className="set-input" type="time" value={do_} onChange={(e) => setDo(e.target.value)} />
            </label>
          </div>
        )}

        <label className="set-pole">
          <span className="set-label">Místo</span>
          <input className="set-input" value={misto} onChange={(e) => setMisto(e.target.value)}
                 placeholder="Brno, kancelář" />
        </label>

        <label className="set-pole">
          <span className="set-label">S kým</span>
          <input className="set-input" value={sKym} onChange={(e) => setSKym(e.target.value)}
                 placeholder="Petr Svoboda" />
        </label>

        <div className="set-pole">
          <span className="set-label">Barva</span>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {Object.entries(BARVY).map(([k, v]) => (
              <button key={k} onClick={() => setBarva(k)} aria-label={k}
                className={`kal__barva ${barva === k ? "kal__barva--on" : ""}`}
                style={{ background: v }} />
            ))}
          </div>
        </div>

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
