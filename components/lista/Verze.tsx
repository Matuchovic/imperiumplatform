"use client";

import { useEffect, useState } from "react";
import { VERZE, VERZE_POPIS, BUILD_ID } from "@/lib/verze";

/**
 * Verze v liště.
 *
 * Číslo je vidět pořád. Když se po nasazení změní, na chvíli se
 * rozsvítí — jinak by si nové verze nikdo nevšiml a hlásil by
 * chyby, které jsou dávno opravené.
 */

const KLIC = "bi-videna-verze";

export default function Verze() {
  const [nova, setNova] = useState(false);
  const [otevreno, setOtevreno] = useState(false);

  useEffect(() => {
    try {
      const videna = localStorage.getItem(KLIC);
      if (videna && videna !== VERZE) setNova(true);
      localStorage.setItem(KLIC, VERZE);
    } catch { /* soukromý režim */ }
  }, []);

  return (
    <div className="zv">
      <button
        className={`vr ${nova ? "vr--nova" : ""} ${otevreno ? "vr--on" : ""}`}
        onClick={() => { setOtevreno((o) => !o); setNova(false); }}
        aria-label={`Verze ${VERZE}`}
      >
        <span className="data">v{VERZE}</span>
        {nova && <span className="vr-tecka" aria-hidden="true" />}
      </button>

      {otevreno && (
        <div className="zv-panel zv-panel--uzky">
          <p className="vr-cislo">v{VERZE}</p>
          <p className="vr-popis">{VERZE_POPIS}</p>
          <p className="data vr-build">sestavení {BUILD_ID}</p>
        </div>
      )}
    </div>
  );
}
