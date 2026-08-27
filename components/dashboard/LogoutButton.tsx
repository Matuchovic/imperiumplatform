"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Odhlášení s potvrzením.
 *
 * Zavírající se zámek je přesnější než fajfka: fajfka říká
 * „povedlo se", zámek říká „je zavřeno" — a to je u odhlášení
 * podstatnější.
 *
 * Průběh se ukáže jen tehdy, když volání trvá déle než 400 ms.
 * Kdyby naskočil vždycky, blikl by i u rychlé odpovědi.
 */

type Stav = "klid" | "bezi" | "hotovo";

const PRODLEVA_MS = 400;   // do kdy se průběh neukazuje
const POTVRZENI_MS = 2300; // jak dlouho je vidět potvrzení

export default function LogoutButton() {
  const router = useRouter();
  const [stav, setStav] = useState<Stav>("klid");
  const [pripojeno, setPripojeno] = useState(false);
  const casovace = useRef<number[]>([]);

  // Portál potřebuje document, který při vykreslení na serveru není.
  useEffect(() => setPripojeno(true), []);
  useEffect(() => () => casovace.current.forEach(clearTimeout), []);

  // Pod překryvem se nesmí rolovat stránka vzadu.
  useEffect(() => {
    document.body.classList.toggle("no-scroll", stav !== "klid");
    return () => document.body.classList.remove("no-scroll");
  }, [stav]);

  async function odhlas() {
    if (stav !== "klid") return;

    // Průběh až po prodlevě — u rychlé odpovědi by jinom blikl.
    const t = window.setTimeout(() => setStav((s) => (s === "klid" ? "bezi" : s)), PRODLEVA_MS);
    casovace.current.push(t);

    try {
      await supabaseBrowser().auth.signOut();
    } catch {
      // I když odhlášení selže, uživatele pryč pustíme — relace
      // vyprší sama a držet ho uvnitř je horší než ho odhlásit.
    }

    clearTimeout(t);
    setStav("hotovo");

    casovace.current.push(
      window.setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, POTVRZENI_MS)
    );
  }

  return (
    <>
      <button
        onClick={odhlas}
        disabled={stav !== "klid"}
        className="lo-btn tap"
      >
        <i className="ti ti-logout" aria-hidden="true" />
        <span className="lo-text">Odhlásit se</span>
      </button>

      {/* Horní lišta má backdrop-filter, a ten vytváří nový kontext,
          vůči kterému by se position: fixed počítalo. Překryv proto
          jde přes portál rovnou do body. */}
      {stav !== "klid" && pripojeno && createPortal(
        <div className="od-scrim" role="status" aria-live="polite">
          <div className="od-panel">
            {stav === "bezi" ? (
              <>
                <div className="od-spin-wrap"><span className="od-spin" /></div>
                <p className="od-nadpis od-nadpis--hned">Odhlašuji…</p>
                <p className="od-popis od-popis--hned">Ukončuji relaci a mažu přihlášení.</p>
              </>
            ) : (
              <>
                <div className="od-znak">
                  <span className="od-zar" aria-hidden="true" />
                  <svg viewBox="0 0 72 72" className="od-kruh-svg" aria-hidden="true">
                    <circle cx="36" cy="36" r="32" fill="none"
                      stroke="rgba(126,240,168,.14)" strokeWidth="2.5" />
                    <circle className="od-kruh" cx="36" cy="36" r="32" fill="none"
                      stroke="#7ef0a8" strokeWidth="2.5" strokeLinecap="round"
                      transform="rotate(-90 36 36)" />
                  </svg>
                  <span className="od-zamek" aria-hidden="true">
                    <i className="ti ti-lock" />
                  </span>
                </div>

                <p className="od-nadpis">Odhlášeno</p>
                <p className="od-popis">Relace ukončena. Přesměrovávám na přihlášení.</p>
                {/* Odpočet místo prázdného čekání — bez něj člověk neví,
                    jestli se něco děje, a začne klikat. */}
                <div className="od-drah"><div className="od-lista" /></div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
