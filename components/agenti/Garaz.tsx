"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KATALOG, BARVY_STAVU, pristiBeh, zaJakDlouho, jakDavno,
  type Agent, type Stav,
} from "@/lib/agenti/katalog";

/**
 * Garáž agentů.
 *
 * Stání místo dlaždic. Běžící agent má pohyblivé světlo po hraně,
 * čekající tepe — bez toho by nebylo poznat, co se právě děje,
 * a garáž by byla jen seznam funkcí.
 */

type StavAgenta = Agent & {
  zapnuty: boolean;
  posledni_beh: string | null;
  ceka: number;
};

type Beh = {
  klic: string; zacatek: string; konec: string | null;
  stav: string; shrnuti: string | null; vysledku: number;
};

export default function Garaz() {
  const [agenti, setAgenti] = useState<StavAgenta[]>([]);
  const [behy, setBehy] = useState<Beh[]>([]);
  const [otevreny, setOtevreny] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [nacteno, setNacteno] = useState(false);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch("/api/agenti", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setChyba(d?.error ?? "Načtení selhalo."); setNacteno(true); return; }
      setAgenti(d.agenti ?? []);
      setBehy(d.behy ?? []);
      setChyba(null);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setNacteno(true);
  }, []);

  useEffect(() => {
    nacti();
    // Běžící agent se má hýbat. Na odsvícené kartě se neptá.
    const t = setInterval(() => { if (!document.hidden) nacti(); }, 30_000);
    return () => clearInterval(t);
  }, [nacti]);

  async function prepni(a: StavAgenta) {
    const zapnout = !a.zapnuty;
    // Optimisticky — přepínač musí reagovat okamžitě.
    setAgenti((s) => s.map((x) => (x.klic === a.klic ? { ...x, zapnuty: zapnout } : x)));

    const r = await fetch("/api/agenti", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ klic: a.klic, akce: zapnout ? "zapnout" : "vypnout" }),
    });

    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setChyba(d?.error ?? "Změna selhala.");
      nacti();
    }
  }

  /** Stav se odvozuje, neukládá — jinak by se rozešel se skutečností. */
  function stavAgenta(a: StavAgenta): Stav {
    if (!a.pripraven) return "priprava";
    if (behy.some((b) => b.klic === a.klic && b.stav === "bezi")) return "bezi";
    if (a.ceka > 0) return "ceka";
    return a.zapnuty ? "stoji" : "stoji";
  }

  const seznam = agenti.length > 0
    ? agenti
    : KATALOG.map((a) => ({ ...a, zapnuty: false, posledni_beh: null, ceka: 0 }));

  const bezi = seznam.filter((a) => stavAgenta(a) === "bezi").length;
  const ceka = seznam.reduce((s, a) => s + a.ceka, 0);
  const dnes = behy.filter(
    (b) => new Date(b.zacatek).toDateString() === new Date().toDateString()
  ).reduce((s, b) => s + b.vysledku, 0);

  return (
    <>
      {chyba && (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text">
            <span className="adm-alert__title">{chyba}</span>{" "}
            <span className="adm-alert__detail">Spustil jsi supabase/agenti.sql?</span>
          </span>
        </div>
      )}

      <div className="adm-cards">
        <div className="tz-kpi">
          <p className="tz-kpi__k">AGENTŮ</p>
          <p className="tz-kpi__n" style={{ color: "#dff5e8" }}>{seznam.length}</p>
        </div>
        <div className="tz-kpi">
          <p className="tz-kpi__k">BĚŽÍ</p>
          <p className="tz-kpi__n" style={{ color: "#7ef0a8" }}>{bezi}</p>
        </div>
        <div className={`tz-kpi ${ceka > 0 ? "tz-kpi--warn" : ""}`}>
          <p className="tz-kpi__k">ČEKÁ NA MĚ</p>
          <p className="tz-kpi__n" style={{ color: ceka ? "#ffc94a" : "#dff5e8" }}>{ceka}</p>
        </div>
        <div className="tz-kpi">
          <p className="tz-kpi__k">DNES UDĚLALI</p>
          <p className="tz-kpi__n" style={{ color: "#dff5e8" }}>{dnes}</p>
        </div>
      </div>

      <div className="gr-mrizka">
        {seznam.map((a, i) => {
          const stav = stavAgenta(a);
          const s = BARVY_STAVU[stav];
          const je = otevreny === a.klic;

          return (
            <div
              key={a.klic}
              className={`gr-stani gr-stani--${stav} ${je ? "gr-stani--on" : ""} ${nacteno ? "gr-stani--prislo" : ""}`}
              style={{
                ["--b" as string]: a.barva,
                ["--s" as string]: s.barva,
                // Stání naskakují po sobě, ne najednou.
                animationDelay: `${i * 90}ms`,
              }}
            >
              <button className="gr-hlavicka" onClick={() => setOtevreny(je ? null : a.klic)}>
                <span className="gr-znak">
                  <i className={`ti ti-${a.ikona}`} aria-hidden="true" />
                </span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="gr-nazev">{a.nazev}</span>
                  <span className="gr-role">{a.role}</span>
                </span>

                <span className="gr-stav">
                  <span className={`gr-tecka ${stav === "bezi" || stav === "ceka" ? "gr-tecka--zive" : ""}`} />
                  {s.nazev}
                </span>
              </button>

              <p className="gr-popis">{a.popis}</p>

              <div className="gr-radka">
                <span>poslední běh <b>{jakDavno(a.posledni_beh)}</b></span>
                <span>příště <b>{a.zapnuty ? zaJakDlouho(pristiBeh(a.posledni_beh, a.interval)) : "stojí"}</b></span>
                {a.ceka > 0 && <span className="gr-ceka">čeká {a.ceka}</span>}
              </div>

              <div className="gr-ovladani">
                <label className="gr-prepinac">
                  <input
                    type="checkbox"
                    className="nt-prep"
                    checked={a.zapnuty}
                    disabled={!a.pripraven}
                    onChange={() => prepni(a)}
                  />
                  <span>{a.zapnuty ? "Zapnutý" : a.pripraven ? "Vypnutý" : "V přípravě"}</span>
                </label>

                <button className="gr-vic" onClick={() => setOtevreny(je ? null : a.klic)}>
                  {je ? "Skrýt" : "Co umí"}
                  <i className={`ti ti-chevron-${je ? "up" : "down"}`} aria-hidden="true" />
                </button>
              </div>

              {je && (
                <div className="gr-detail">
                  <p className="gr-proc">{a.proc}</p>

                  {a.umi.map((u, j) => (
                    <div key={j} className="gr-bod">
                      <i className={`ti ti-${u.ikona}`} aria-hidden="true" />
                      <span>{u.text}</span>
                    </div>
                  ))}

                  {/* Hranice patří vedle schopností, ne do dokumentace. */}
                  <p className="data gr-nesmi__nadpis">CO NEUDĚLÁ</p>
                  {a.nesmi.map((n, j) => (
                    <div key={j} className="gr-nesmi">
                      <i className="ti ti-x" aria-hidden="true" />
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
