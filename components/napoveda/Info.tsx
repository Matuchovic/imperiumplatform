"use client";

import { useEffect, useState } from "react";

/**
 * Panel s radou.
 *
 * Dá se zavřít a už se nevrátí. Nápověda, kterou nejde odklidit,
 * po týdnu překáží a lidé ji přestanou číst i tam, kde by pomohla.
 *
 * Zavření se pamatuje v prohlížeči, ne na serveru — je to
 * rozhodnutí o zobrazení, ne data.
 */

export default function Info({
  klic,
  tón = "rada",
  children,
}: {
  /** Jedinečný klíč. Podle něj se pamatuje zavření. */
  klic: string;
  tón?: "rada" | "pozor";
  children: React.ReactNode;
}) {
  const [videt, setVidet] = useState(false);
  const [odchazi, setOdchazi] = useState(false);

  // Až po připojení — na serveru localStorage není a rozhraní
  // by se lišilo od toho, co přijde z prohlížeče.
  useEffect(() => {
    try {
      setVidet(localStorage.getItem(`info:${klic}`) !== "zavreno");
    } catch {
      setVidet(true);
    }
  }, [klic]);

  function zavri() {
    setOdchazi(true);
    try { localStorage.setItem(`info:${klic}`, "zavreno"); } catch { /* soukromý režim */ }
    setTimeout(() => setVidet(false), 220);
  }

  if (!videt) return null;

  return (
    <div className={`info ${tón === "pozor" ? "info--pozor" : ""} ${odchazi ? "info--pryc" : ""}`}>
      <span className={`info__znak ${tón === "pozor" ? "info__znak--pozor" : ""}`}>
        <i className={`ti ti-${tón === "pozor" ? "alert-triangle" : "bulb"}`} aria-hidden="true" />
      </span>
      <span className="info__text">{children}</span>
      <button className="info__zavrit" onClick={zavri} aria-label="Skrýt radu">
        <i className="ti ti-x" aria-hidden="true" />
      </button>
    </div>
  );
}
