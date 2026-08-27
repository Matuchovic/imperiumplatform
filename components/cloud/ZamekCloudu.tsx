"use client";

import { useCallback, useEffect, useState } from "react";
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

  const zjisti = useCallback(async () => {
    try {
      const r = await fetch("/api/cloud/zamek", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (r.ok) setStav(d);
    } catch { /* zkusí se při další akci */ }
  }, []);

  useEffect(() => { zjisti(); }, [zjisti]);
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

  async function nastav(hodnota: string) {
    if (hodnota.length !== PIN_DELKA) { setChyba(`PIN musí mít ${PIN_DELKA} číslic.`); return; }
    setBezi(true);
    setChyba(null);
    try {
      const r = await fetch("/api/cloud/zamek", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: hodnota, stary }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Nastavení selhalo.");
      else {
        // Po nastavení rovnou odemkneme, ať se nezadává dvakrát.
        await odemkni(hodnota);
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
    return <div className="pb-cekam">Ověřuji přístup…</div>;
  }

  if (stav.odemceno) {
    return (
      <>
        <div className="pb-lista">
          <span className="pb-lista__stav">
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
  const hodnota = nastavuje ? novy : pin;

  const cislo = (c: string) => {
    if (stav.blokovano || hodnota.length >= PIN_DELKA) return;
    const dalsi = hodnota + c;
    nastavuje ? setNovy(dalsi) : setPin(dalsi);
    setChyba(null);
    // Po poslední číslici se vyhodnotí samo. Tlačítko zůstává
    // pro toho, kdo raději potvrzuje.
    if (dalsi.length === PIN_DELKA) {
      setTimeout(() => (nastavuje ? nastav(dalsi) : odemkni(dalsi)), 240);
    }
  };

  const smaz = () => {
    if (stav.blokovano) return;
    nastavuje ? setNovy(novy.slice(0, -1)) : setPin(pin.slice(0, -1));
    setChyba(null);
  };

  const vymaz = () => {
    nastavuje ? setNovy("") : setPin("");
    setChyba(null);
  };

  return (
    <div className="pb-scena">
      <div className={`pb-board ${stav.blokovano ? "pb-board--zle" : ""} ${chyba ? "pb-tres" : ""}`}>
        <p className={`pb-nadpis ${stav.blokovano ? "pb-nadpis--zle" : ""}`}>
          BETIMPERIUM PASS PIN
        </p>
        <div className="pb-linka" />

        <div className="pb-telo">
          <div>
            <p className="pb-titulek">
              {stav.blokovano ? "Zablokováno" : nastavuje ? "Nastav PIN" : "Cloud je zamčený"}
            </p>
            <p className="pb-popis">
              {stav.blokovano
                ? "Příliš mnoho nesprávných pokusů. Brána se otevře za patnáct minut."
                : nastavuje
                  ? `Zvol ${PIN_DELKA}místný PIN. Bude potřeba při každém vstupu do cloudu.`
                  : `Zadej ${PIN_DELKA}místný PIN.`}
            </p>

            <div className="pb-tecky">
              {Array.from({ length: PIN_DELKA }, (_, i) => (
                <span
                  key={i}
                  className={[
                    "pb-tec",
                    i < hodnota.length ? "pb-tec--on" : "",
                    chyba || stav.blokovano ? "pb-tec--zle" : "",
                  ].join(" ")}
                />
              ))}
            </div>

            {chyba ? (
              <p className="pb-hlaska pb-hlaska--zle">{chyba}</p>
            ) : stav.zbyva !== null && stav.zbyva < MAX_POKUSU && !stav.blokovano ? (
              <p className="pb-hlaska pb-hlaska--warn">Zbývá {stav.zbyva} pokusů</p>
            ) : (
              <p className="pb-hlaska">&nbsp;</p>
            )}
          </div>

          <div className="pb-klav">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((c) => (
              <button key={c} className="pb-kl" onClick={() => cislo(c)} disabled={stav.blokovano || bezi}>
                {c}
              </button>
            ))}
            <span />
            <button className="pb-kl" onClick={() => cislo("0")} disabled={stav.blokovano || bezi}>0</button>
            <button className="pb-kl" onClick={smaz} disabled={stav.blokovano || bezi} aria-label="Smazat">
              <i className="ti ti-backspace" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="pb-pata">
          <button className="pb-btn" onClick={vymaz} disabled={stav.blokovano || bezi}>
            <i className="ti ti-eraser" aria-hidden="true" />
            Vymazat
          </button>
          <button
            className="pb-btn pb-btn--hlavni"
            onClick={() => (nastavuje ? nastav(novy) : odemkni(pin))}
            disabled={stav.blokovano || bezi || hodnota.length !== PIN_DELKA}
          >
            <i className="ti ti-arrow-right" aria-hidden="true" />
            {bezi ? "Ověřuji…" : nastavuje ? "Nastavit PIN" : "Odemknout"}
          </button>
        </div>

        <p className="data pb-pravidla">
          PIN ULOŽEN JAKO OTISK · PO PĚTI POKUSECH BLOKACE · PLATÍ I PRO PŘÍMÉ VOLÁNÍ API
        </p>
      </div>
    </div>
  );
}
