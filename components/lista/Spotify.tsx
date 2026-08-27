"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Spotify.
 *
 * Otevře přehrávač v nové kartě. Skutečné ovládání přehrávání
 * uvnitř aplikace by znamenalo přihlášení přes Spotify, jejich
 * knihovnu a placený účet u každého — pro tlačítko „pustit hudbu"
 * je to nepoměr.
 */

const ODKAZY = [
  { nazev: "Otevřít Spotify", popis: "Přehrávač v nové kartě", url: "https://open.spotify.com", ikona: "player-play" },
  { nazev: "Soustředění", popis: "Deep Focus", url: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ", ikona: "headphones" },
  { nazev: "Do práce", popis: "Lo-Fi Beats", url: "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn", ikona: "coffee" },
];

export default function Spotify() {
  const [otevreno, setOtevreno] = useState(false);
  const obal = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const klik = (e: MouseEvent) => {
      if (!obal.current?.contains(e.target as Node)) setOtevreno(false);
    };
    document.addEventListener("mousedown", klik);
    return () => document.removeEventListener("mousedown", klik);
  }, []);

  return (
    <div className="zv" ref={obal}>
      <button
        className={`zv-tlacitko zv-tlacitko--spotify tap ${otevreno ? "zv-tlacitko--on" : ""}`}
        onClick={() => setOtevreno((o) => !o)}
        aria-label="Spotify"
        aria-expanded={otevreno}
      >
        <i className="ti ti-brand-spotify" aria-hidden="true" />
      </button>

      {otevreno && (
        <div className="zv-panel zv-panel--uzky" role="menu">
          {ODKAZY.map((o) => (
            <a
              key={o.url}
              className="zv-radek"
              href={o.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOtevreno(false)}
              role="menuitem"
            >
              <span className="zv-ikona zv-ikona--spotify">
                <i className={`ti ti-${o.ikona}`} aria-hidden="true" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="zv-nazev">{o.nazev}</span>
                <span className="zv-popis">{o.popis}</span>
              </span>
              <i className="ti ti-external-link zv-sipka" aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
