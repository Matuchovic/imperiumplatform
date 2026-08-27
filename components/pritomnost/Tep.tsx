"use client";

import { useEffect } from "react";

/**
 * Tep přítomnosti.
 *
 * Každých pětačtyřicet vteřin dá vědět, že je uživatel u počítače.
 * Na odsvícené kartě mlčí — jinak by systém tvrdil, že je člověk
 * online, i když má notebook zavřený.
 */

const INTERVAL_MS = 45_000;

export default function Tep() {
  useEffect(() => {
    const tep = () => {
      if (document.hidden) return;
      // keepalive doručí i požadavek odeslaný při zavírání karty.
      fetch("/api/pritomnost", { method: "POST", keepalive: true }).catch(() => undefined);
    };

    tep();
    const t = setInterval(tep, INTERVAL_MS);

    // Návrat na kartu ohlásí hned, ne až za tři čtvrtě minuty.
    const priZmene = () => { if (!document.hidden) tep(); };
    document.addEventListener("visibilitychange", priZmene);

    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", priZmene);
    };
  }, []);

  return null;
}
