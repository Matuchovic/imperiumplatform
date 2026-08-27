"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PIN_DELKA, MAX_POKUSU } from "@/lib/cloud/zamek-verejne";

/**
 * Brána před Cloudem.
 *
 * Zámek se ověřuje i na serveru — tohle je jen obrazovka. Kdyby
 * stačilo ji přeskočit, dal by se cloud otevřít voláním API.
 */

type Stav = {
  maPin: boolean;
  odemceno: boolean;
  blokovano: boolean;
  zbyva: number | null;
};

export default function ZamekCloudu({ deti }: { deti: React.ReactNode }) {
  const [stav, setStav] = useState<Stav | null>(null);
  const [pin, setPin] = useState("");
  const [novy, setNovy] = useState("");
  const [stary, setStary] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);
  const [bezi, setBezi] = useState(false);
  const pole = useRef<HTMLInputElement>(null);

  const zjisti = useCallback(async () => {
    try {
      const r = await fetch("/api/cloud/zamek", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (r.ok) setStav(d);
    } catch { /* zkusí se při další akci */ }
  }, []);

  useEffect(() => { zjisti(); }, [zjisti]);
  useEffect(() => {
    if (stav && !stav.odemceno) setTimeout(() => pole.current?.focus(), 80);
  }, [stav]);

  async function odemkni(hodnota: string) {
    if (hodnota.length !== PIN_DELKA || bezi) return;
    setBezi(true);
    setChyba(null);
    try {
      const r = await fetch("/api/cloud/zamek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: hodnota }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setChyba(d?.error ?? "Odemčení selhalo.");
        setPin("");
        zjisti();
      } else {
        setStav((s) => (s ? { ...s, odemceno: true } : s));
      }
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setBezi(false);
  }

  async function nastav() {
    if (novy.length !== PIN_DELKA) { setChyba(`PIN musí mít ${PIN_DELKA} číslic.`); return; }
    setBezi(true);
    setChyba(null);
    try {
      const r = await fetch("/api/cloud/zamek", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: novy, stary }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Nastavení selhalo.");
      else {
        // Po nastavení rovnou odemkneme, ať se nezadává dvakrát.
        await odemkni(novy);
        setNovy(""); setStary("");
        zjisti();
      }
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setBezi(false);
  }

  async function zamkni() {
    await fetch("/api/cloud/zamek", { method: "DELETE" }).catch(() => undefined);
    setPin("");
    zjisti();
  }

  if (!stav) {
    return <div className="zm-cekam">Ověřuji přístup…</div>;
  }

  if (stav.odemceno) {
    return (
      <>
        <div className="zm-lista">
          <span className="zm-lista__stav">
            <i className="ti ti-lock-open" aria-hidden="true" />
            Cloud odemčený na 30 minut
          </span>
          <button className="adm-btn" onClick={zamkni}>
            <i className="ti ti-lock" aria-hidden="true" />
            Zamknout
          </button>
        </div>
        {deti}
      </>
    );
  }

  const nastavuje = !stav.maPin;

  return (
    <div className="zm-brana">
      <div className="zm-panel">
        <span className="zm-znak" aria-hidden="true">
          <i className={`ti ti-${stav.blokovano ? "lock-exclamation" : "lock"}`} />
        </span>

        <p className="zm-nadpis">
          {nastavuje ? "Nastav PIN k cloudu" : stav.blokovano ? "Cloud je zablokovaný" : "Cloud je zamčený"}
        </p>
        <p className="zm-popis">
          {nastavuje
            ? `Zvol ${PIN_DELKA}místný PIN. Bude potřeba při každém vstupu do cloudu.`
            : stav.blokovano
              ? "Příliš mnoho nesprávných pokusů. Zkus to za patnáct minut."
              : `Zadej ${PIN_DELKA}místný PIN.`}
        </p>

        {chyba && <p className="zm-chyba">{chyba}</p>}

        {nastavuje ? (
          <>
            <input
              ref={pole}
              className="zm-vstup"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={PIN_DELKA}
              value={novy}
              onChange={(e) => { setNovy(e.target.value.replace(/\D/g, "")); setChyba(null); }}
              onKeyDown={(e) => e.key === "Enter" && nastav()}
              placeholder="••••••"
              aria-label="Nový PIN"
            />
            <button className="zm-tlacitko" onClick={nastav} disabled={bezi || novy.length !== PIN_DELKA}>
              {bezi ? "Ukládám…" : "Nastavit PIN"}
            </button>
          </>
        ) : (
          <>
            <input
              ref={pole}
              className="zm-vstup"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={PIN_DELKA}
              value={pin}
              disabled={stav.blokovano || bezi}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setPin(v);
                setChyba(null);
                // Odemyká se samo po šesté číslici — potvrzovací
                // tlačítko je u PINu krok navíc.
                if (v.length === PIN_DELKA) odemkni(v);
              }}
              placeholder="••••••"
              aria-label="PIN"
            />
            {stav.zbyva !== null && stav.zbyva < MAX_POKUSU && !stav.blokovano && (
              <p className="zm-zbyva">Zbývá {stav.zbyva} pokusů</p>
            )}
          </>
        )}

        <p className="data zm-pata">
          PIN JE ULOŽENÝ JAKO OTISK · PO PĚTI POKUSECH SE BRÁNA ZAMKNE
        </p>
      </div>
    </div>
  );
}
