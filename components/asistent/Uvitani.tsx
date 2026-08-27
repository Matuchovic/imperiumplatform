"use client";

import { useEffect, useRef, useState } from "react";
import { rekni } from "@/lib/asistent/hlas";
import { uvitani } from "@/lib/asistent/uvitani";
import { odemkniZvuk } from "@/lib/zvuk/prehravac";

/**
 * Uvítání po přihlášení.
 *
 * Jednou za relaci prohlížeče, ne při každém přepnutí sekce.
 * Značka je v sessionStorage — zavřením karty se zapomene,
 * což je přesně ta hranice, kde má smysl přivítat znovu.
 */

const KLIC = "bi-uvitano";

export default function Uvitani({ jmeno }: { jmeno: string }) {
  const [tiche, setTiche] = useState<string | null>(null);
  const bezelo = useRef(false);

  useEffect(() => {
    if (bezelo.current) return;
    bezelo.current = true;

    try {
      if (sessionStorage.getItem(KLIC) === "ano") return;
      sessionStorage.setItem(KLIC, "ano");
    } catch {
      return; // soukromý režim — raději nemluvit než mluvit pořád
    }

    void (async () => {
      // Odemčení z klepnutí na Přihlásit se většinou přežije,
      // ale jistota to není.
      odemkniZvuk();

      let souhrn = {};
      try {
        const r = await fetch("/api/upozorneni", { cache: "no-store" });
        const d = await r.json().catch(() => null);
        const p = (d?.polozky ?? []) as { klic: string; pocet: number }[];
        const kolik = (k: string) => p.find((x) => x.klic === k)?.pocet ?? 0;
        souhrn = {
          posta: kolik("betmail"),
          podpora: kolik("podpora"),
          ukoly: kolik("ukoly"),
          faktury: kolik("faktury"),
        };
      } catch { /* pozdravíme i bez souhrnu */ }

      const veta = uvitani(jmeno, souhrn);
      rekni(veta, true);

      /**
       * Když prohlížeč zvuk nepustí, věta se ukáže napsaná.
       *
       * Mlčení by vypadalo jako porucha — a informace v ní
       * je užitečná, i když ji nikdo neuslyší.
       */
      setTimeout(() => {
        try {
          if (!navigator.userActivation?.hasBeenActive) setTiche(veta);
        } catch { /* starší prohlížeč to neumí zjistit */ }
      }, 900);
    })();
  }, [jmeno]);

  if (!tiche) return null;

  return (
    <div className="uv-lista" role="status">
      <span className="uv-znak">
        <i className="ti ti-volume" aria-hidden="true" />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>{tiche}</span>
      <button
        className="adm-btn"
        onClick={() => { odemkniZvuk(); rekni(tiche, true); setTiche(null); }}
      >
        Přehrát
      </button>
      <button className="tap cl-close" onClick={() => setTiche(null)} aria-label="Zavřít">
        <i className="ti ti-x" aria-hidden="true" />
      </button>
    </div>
  );
}
