"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Asistent.
 *
 * Otevírá se zkratkou a zase zmizí — není to trvalý panel po straně.
 * Do systému, ve kterém člověk pracuje celý den, patří nástroj,
 * který se objeví na vyžádání, ne který zabírá místo pořád.
 */

type Odpoved = {
  text: string;
  nastroj: string | null;
  sekce: string | null;
  data: unknown;
  degradovano: boolean;
};

const RYCHLE = [
  "Jak jsme na tom s klienty?",
  "Kdo dnes potřebuje pozornost?",
  "Které pásmo má nejlepší CLV?",
  "Kdy naposled běžel motor?",
];

export default function Jadro() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dotaz, setDotaz] = useState("");
  const [bezi, setBezi] = useState(false);
  const [odp, setOdp] = useState<Odpoved | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const pole = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const klavesa = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", klavesa);
    return () => window.removeEventListener("keydown", klavesa);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
    if (open) setTimeout(() => pole.current?.focus(), 60);
    return () => document.body.classList.remove("no-scroll");
  }, [open]);

  const zeptej = useCallback(async (text: string) => {
    if (!text.trim() || bezi) return;
    setBezi(true);
    setChyba(null);
    setOdp(null);

    try {
      const res = await fetch("/api/asistent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dotaz: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) setChyba(data?.error ?? `Asistent selhal (${res.status}).`);
      else setOdp(data as Odpoved);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setBezi(false);
  }, [bezi]);

  if (!open) {
    return (
      <button className="jd-tlacitko" onClick={() => setOpen(true)} aria-label="Otevřít asistenta">
        <span className="jd-tlacitko__jadro" />
        <span className="data jd-tlacitko__zkr">⌘K</span>
      </button>
    );
  }

  return (
    <>
      <div className="jd-scrim" onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="jd-panel" role="dialog" aria-label="Asistent">
        <div className="jd-hlava">
          <span className={`jd-core ${bezi ? "jd-core--bezi" : ""}`} aria-hidden="true">
            <span className="jd-core__prsten jd-core__prsten--1" />
            <span className="jd-core__prsten jd-core__prsten--2" />
            <span className="jd-core__stred" />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="jd-nazev">Asistent</span>
            <span className="data jd-podnazev">
              {bezi ? "ČTU Z DATABÁZE" : "ČÍSLA POČÍTÁ DATABÁZE, NE MODEL"}
            </span>
          </span>
          <button className="jd-zavrit tap" onClick={() => setOpen(false)} aria-label="Zavřít">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className="jd-telo">
          {chyba && (
            <div className="adm-alert adm-alert--bad">
              <span className="adm-alert__text">
                <span className="adm-alert__title">{chyba}</span>
              </span>
            </div>
          )}

          {!odp && !bezi && !chyba && (
            <>
              <p className="jd-uvod">
                Zeptejte se na cokoli ze systému. Odpověď vždycky vychází z dat,
                ne z odhadu — a je u ní vidět, odkud pochází.
              </p>
              <div className="jd-rychle">
                {RYCHLE.map((r) => (
                  <button key={r} className="jd-chip" onClick={() => { setDotaz(r); zeptej(r); }}>
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}

          {odp && (
            <>
              <p className={`jd-odpoved ${odp.degradovano ? "jd-odpoved--slabe" : ""}`}>{odp.text}</p>

              {odp.nastroj && (
                <span className="data jd-zdroj">
                  <i className="ti ti-database" aria-hidden="true" />
                  {odp.nastroj}
                </span>
              )}

              {odp.data !== null && odp.data !== undefined && (
                <details className="jd-data">
                  <summary>Ukázat data</summary>
                  <pre>{JSON.stringify(odp.data, null, 2)}</pre>
                </details>
              )}

              {odp.sekce && (
                <div className="adm-actions">
                  <button
                    className="adm-btn adm-btn--primary"
                    onClick={() => { setOpen(false); router.push(odp.sekce as string); }}
                  >
                    <i className="ti ti-arrow-right" aria-hidden="true" />
                    Otevřít sekci
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="jd-pata">
          <span className="jd-vstup">
            <i className="ti ti-sparkles" aria-hidden="true" />
            <input
              ref={pole}
              value={dotaz}
              onChange={(e) => setDotaz(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") zeptej(dotaz); }}
              placeholder="Zeptejte se na cokoli ze systému…"
              aria-label="Dotaz na asistenta"
              disabled={bezi}
            />
            <button
              className="jd-odeslat tap"
              onClick={() => zeptej(dotaz)}
              disabled={bezi || !dotaz.trim()}
              aria-label="Odeslat"
            >
              <i className={`ti ti-${bezi ? "loader-2" : "arrow-up"}`} aria-hidden="true" />
            </button>
          </span>

          <p className="data jd-prava">
            <span>ČTE DATA · NAVRHUJE AKCE</span>
            <span className="jd-prava--ne">NESAHÁ NA BANKROLL · ZÚČTOVÁNÍ · ROLE · PLATBY</span>
          </p>
        </div>
      </div>
    </>
  );
}
