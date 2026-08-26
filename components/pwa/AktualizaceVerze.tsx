"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { VERZE } from "@/lib/verze";
import { kolikNeulozenych, sledujPraci } from "@/lib/rozdelanaPrace";

/**
 * ════════════════════════════════════════════════════════════════
 * AKTUALIZACE VERZE
 *
 * Aplikaci má člověk otevřenou celý den. Bez tohohle by pracoval
 * s týden starým buildem, dokud by okno nezavřel — a v nainstalované
 * PWA se okno nezavírá skoro nikdy.
 *
 * ⚠️ NEJDŮLEŽITĚJŠÍ PRAVIDLO: NIKDY NEOBNOVIT NAD ROZDĚLANOU PRACÍ.
 *
 * Automatické obnovení se spouští při přechodu na jinou stránku —
 * tedy přesně v okamžiku, kdy může být formulář rozepsaný. Proto se
 * lišta ptá `rozdelanaPrace`, a dokud je co ztratit, počká.
 *
 * DALŠÍ ZÁSADY:
 *  · dotazování se PO NÁLEZU ZASTAVÍ a na skryté záložce pauzuje.
 *    Patnáct lidí osm hodin denně je jinak tisíce zbytečných dotazů.
 *  · lišta říká ČÍSLO VERZE a větu o tom, co se změnilo. „Nová verze"
 *    nikoho nepřesvědčí, aby přerušil práci.
 *  · rozlišuje BĚŽNOU aktualizaci od DŮLEŽITÉ opravy. Běžnou jde
 *    odložit, důležitou ne.
 *  · v PWA se navíc probudí nový servisní worker. Bez toho by
 *    obnovení naservírovalo starou skořápku z mezipaměti.
 * ════════════════════════════════════════════════════════════════
 */

const INTERVAL_MS = 60_000;
const PRVNI_MS = 8_000;
const ODLOZIT_MS = 15 * 60_000;

type Nova = { verze: string; popis: string; dulezita: boolean };

export default function AktualizaceVerze() {
  const [nova, setNova] = useState<Nova | null>(null);
  const [obnovuji, setObnovuji] = useState(false);
  const [neulozeno, setNeulozeno] = useState(0);
  const odlozenoDo = useRef(0);
  const pathname = usePathname();

  useEffect(() => sledujPraci(setNeulozeno), []);

  const zkontroluj = useCallback(async () => {
    if (nova) return; // po nálezu už není co zjišťovat
    if (Date.now() < odlozenoDo.current) return;

    try {
      const res = await fetch("/api/verze", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<Nova>;
      if (data.verze && data.verze !== VERZE) {
        setNova({
          verze: data.verze,
          popis: data.popis ?? "",
          dulezita: Boolean(data.dulezita),
        });
      }
    } catch {
      // Výpadek sítě není důvod cokoliv hlásit. Zkusí se za minutu.
    }
  }, [nova]);

  useEffect(() => {
    if (nova) return;

    const prvni = window.setTimeout(zkontroluj, PRVNI_MS);
    const tik = window.setInterval(() => {
      if (!document.hidden) zkontroluj();
    }, INTERVAL_MS);

    // Návrat k záložce je nejčastější okamžik, kdy mezitím vyšla nová verze.
    const priNavratu = () => { if (!document.hidden) zkontroluj(); };
    document.addEventListener("visibilitychange", priNavratu);
    window.addEventListener("focus", zkontroluj);

    return () => {
      window.clearTimeout(prvni);
      window.clearInterval(tik);
      document.removeEventListener("visibilitychange", priNavratu);
      window.removeEventListener("focus", zkontroluj);
    };
  }, [zkontroluj, nova]);

  const obnov = useCallback(async () => {
    setObnovuji(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.map(async (r) => {
            await r.update().catch(() => undefined);
            // Nový worker jinak čeká, až se zavřou všechny záložky.
            r.waiting?.postMessage("SKIP_WAITING");
          })
        );
      }
      if ("caches" in window) {
        const klice = await caches.keys();
        await Promise.all(klice.map((k) => caches.delete(k)));
      }
    } catch {
      // I když úklid selže, obnovit se má.
    }
    window.location.reload();
  }, []);

  // Přechod na jinou stránku je bezpečný okamžik — stránka se stejně
  // překresluje. Ale jen když není co ztratit.
  const prvniVykresleni = useRef(true);
  useEffect(() => {
    if (prvniVykresleni.current) { prvniVykresleni.current = false; return; }
    if (nova && neulozeno === 0) obnov();
  }, [pathname, nova, neulozeno, obnov]);

  if (!nova) return null;

  const blokuje = neulozeno > 0;

  return (
    <div className={`akt ${nova.dulezita ? "akt--dulezita" : ""}`} role="status" aria-live="polite">
      <span className="akt__dot" />

      <span className="akt__text">
        <strong>
          {nova.dulezita ? "Důležitá oprava" : "Nová verze"} {VERZE} → {nova.verze}
        </strong>
        {nova.popis && <span className="akt__popis"> {nova.popis}</span>}
        {blokuje && (
          <span className="akt__cekam">
            Máš neuložené změny — obnovení počká, dokud je neuložíš.
          </span>
        )}
      </span>

      <button className="akt__btn" onClick={obnov} disabled={obnovuji}>
        {obnovuji ? "Obnovuji…" : "Obnovit"}
      </button>

      {!nova.dulezita && (
        <button
          className="akt__odloz"
          onClick={() => { odlozenoDo.current = Date.now() + ODLOZIT_MS; setNova(null); }}
        >
          Později
        </button>
      )}
    </div>
  );
}
