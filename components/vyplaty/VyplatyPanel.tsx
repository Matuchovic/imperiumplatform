"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import {
  STAVY, hruba, kVyplate, vyhrady, souhrn, nazevObdobi, prvniDen, posun, kc,
  type Stav,
} from "@/lib/vyplaty/vypocet";
import { UVAZKY } from "@/lib/personal/oddeleni";

/**
 * Výplaty za období.
 *
 * Zapisuje se ručně — systém nemá docházku, ze které by hodiny
 * bral. Změna políčka se ukládá při opuštění, ne při každém úhozu.
 */

type Radek = {
  user_id: string;
  jmeno: string;
  role: string;
  uvazek: string | null;
  id: number | null;
  hodiny: number | null;
  sazba: number | null;
  mesicni: number | null;
  premie: number;
  srazky: number;
  zalohy: number;
  hrube: number | null;
  ciste: number | null;
  stav: string;
  poznamka: string | null;
};

export default function VyplatyPanel({ jeSpravce }: { jeSpravce: boolean }) {
  const dnes = new Date();
  const [obdobi, setObdobi] = useState(() => prvniDen(dnes.getFullYear(), dnes.getMonth()));
  const [radky, setRadky] = useState<Radek[]>([]);
  const [chyba, setChyba] = useState<string | null>(null);
  const [uklada, setUklada] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch(`/api/vyplaty?obdobi=${obdobi}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setChyba(d?.error ?? "Načtení selhalo."); return; }
      setRadky(d.radky ?? []);
      setChyba(null);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }, [obdobi]);

  useEffect(() => { nacti(); }, [nacti]);

  async function uloz(r: Radek) {
    setUklada(r.user_id);
    try {
      const odp = await fetch("/api/vyplaty", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obdobi, ...r }),
      });
      if (!odp.ok) {
        const d = await odp.json().catch(() => null);
        setChyba(d?.error ?? "Uložení selhalo.");
      }
    } catch {
      setChyba("Uložení selhalo.");
    }
    setUklada(null);
  }

  /** Změna v paměti. Na server se posílá až při opuštění políčka. */
  function zmen(userId: string, klic: keyof Radek, hodnota: string | number | null) {
    setRadky((s) => s.map((r) => (r.user_id === userId ? { ...r, [klic]: hodnota } : r)));
  }

  const celkem = useMemo(() => souhrn(radky), [radky]);
  const problemy = useMemo(
    () => radky.filter((r) => r.stav !== "rozpracovano" && vyhrady(r).length > 0),
    [radky]
  );
  const hotovo = radky.filter((r) => r.stav === "vyplaceno").length;

  return (
    <>
      {chyba && (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text">
            <span className="adm-alert__title">{chyba}</span>{" "}
            <span className="adm-alert__detail">Spustil jsi supabase/vyplaty.sql?</span>
          </span>
        </div>
      )}

      <div className="vy-ovladani">
        <button className="adm-btn" onClick={() => setObdobi(posun(obdobi, -1))} aria-label="Předchozí měsíc">
          <i className="ti ti-chevron-left" aria-hidden="true" />
        </button>
        <span className="vy-obdobi">{nazevObdobi(obdobi)}</span>
        <button className="adm-btn" onClick={() => setObdobi(posun(obdobi, 1))} aria-label="Další měsíc">
          <i className="ti ti-chevron-right" aria-hidden="true" />
        </button>
        <button
          className="adm-btn"
          onClick={() => setObdobi(prvniDen(dnes.getFullYear(), dnes.getMonth()))}
        >
          Tento měsíc
        </button>
      </div>

      <div className="adm-cards">
        <div className="tz-kpi">
          <p className="tz-kpi__k">HRUBÉ CELKEM</p>
          <p className="tz-kpi__n" style={{ fontSize: 18, color: "#dff5e8" }}>{kc(celkem.hrube)}</p>
        </div>
        <div className="tz-kpi">
          <p className="tz-kpi__k">K VÝPLATĚ</p>
          <p className="tz-kpi__n" style={{ fontSize: 18, color: "#7ef0a8" }}>{kc(celkem.kVyplate)}</p>
        </div>
        <div className="tz-kpi">
          <p className="tz-kpi__k">SRÁŽKY A ZÁLOHY</p>
          <p className="tz-kpi__n" style={{ fontSize: 18, color: "#dff5e8" }}>
            {kc(celkem.srazky + celkem.zalohy)}
          </p>
        </div>
        <div className="tz-kpi">
          <p className="tz-kpi__k">VYPLACENO</p>
          <p className="tz-kpi__n" style={{ color: "#7ef0a8" }}>
            {hotovo}<span style={{ fontSize: 14, color: "#5b6c61" }}> / {radky.length}</span>
          </p>
        </div>
      </div>

      {/* Kontrola před výplatou chytí chyby dřív než banka. */}
      {problemy.length > 0 && (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">
              {problemy.length === 1 ? "Jeden řádek má výhradu." : `${problemy.length} řádků má výhradu.`}
            </span>{" "}
            <span className="adm-alert__detail">
              {problemy.map((p) => `${p.jmeno}: ${vyhrady(p)[0]}`).join(" · ")}
            </span>
          </span>
        </div>
      )}

      <div className="scroll-x" style={{ marginTop: 14 }}>
        <table className="vy-tab">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Člověk</th>
              <th>Hodiny</th>
              <th>Sazba</th>
              <th>Měsíčně</th>
              <th>Prémie</th>
              <th>Srážky</th>
              <th>Zálohy</th>
              <th>Hrubá</th>
              <th>K výplatě</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            {radky.map((r) => {
              const v = vyhrady(r);
              const s = STAVY[r.stav as Stav] ?? STAVY.rozpracovano;
              return (
                <tr key={r.user_id} className={uklada === r.user_id ? "vy-radek--uklada" : ""}>
                  <td className="vy-clovek">
                    <Avatar jmeno={r.jmeno} velikost={28} />
                    <span style={{ minWidth: 0 }}>
                      <span className="vy-jmeno">{r.jmeno}</span>
                      {r.uvazek && <span className="data vy-uvazek">{UVAZKY[r.uvazek]}</span>}
                    </span>
                  </td>

                  {(["hodiny", "sazba", "mesicni", "premie", "srazky", "zalohy"] as const).map((k) => (
                    <td key={k}>
                      <input
                        className="vy-pole"
                        type="number"
                        inputMode="decimal"
                        value={r[k] ?? ""}
                        onChange={(e) => zmen(r.user_id, k, e.target.value === "" ? null : Number(e.target.value))}
                        onBlur={() => uloz(r)}
                        aria-label={`${k} pro ${r.jmeno}`}
                      />
                    </td>
                  ))}

                  <td className="data vy-castka">{kc(hruba(r))}</td>
                  <td className="data vy-castka vy-castka--hlavni">{kc(kVyplate(r))}</td>

                  <td>
                    <select
                      className="vy-stav"
                      style={{ color: s.barva }}
                      value={r.stav}
                      onChange={(e) => {
                        const novy = { ...r, stav: e.target.value };
                        setRadky((x) => x.map((y) => (y.user_id === r.user_id ? novy : y)));
                        uloz(novy);
                      }}
                      aria-label={`Stav pro ${r.jmeno}`}
                    >
                      {Object.entries(STAVY).map(([k, val]) => (
                        <option key={k} value={k}>{val.nazev}</option>
                      ))}
                    </select>
                    {v.length > 0 && r.stav !== "rozpracovano" && (
                      <span className="vy-vyhrada" title={v.join(" ")}>
                        <i className="ti ti-alert-circle" aria-hidden="true" />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ textAlign: "left" }}>Celkem</td>
              <td className="data">{celkem.hodiny || ""}</td>
              <td colSpan={3} />
              <td className="data">{kc(celkem.srazky)}</td>
              <td className="data">{kc(celkem.zalohy)}</td>
              <td className="data">{kc(celkem.hrube)}</td>
              <td className="data vy-castka--hlavni">{kc(celkem.kVyplate)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {radky.length === 0 && (
        <div className="tz-skupina">
          <p className="adm-panel__lead" style={{ margin: 0 }}>
            Za tohle období tu nikdo není. Členem se stane každý, komu přiřadíš
            jinou roli než klient.
          </p>
        </div>
      )}

      <p className="data" style={{
        margin: "14px 0 0", fontSize: 10, letterSpacing: "0.1em", lineHeight: 1.7, color: "#4c6d5b",
      }}>
        ZMĚNA SE ULOŽÍ PŘI OPUŠTĚNÍ POLÍČKA · MĚSÍČNÍ PLAT MÁ PŘEDNOST PŘED HODINAMI
        {jeSpravce && " · SAZBU LZE ULOŽIT DO PROFILU V PERSONÁLU"}
      </p>
    </>
  );
}
