"use client";

import { useEffect, useRef, useState } from "react";
import { KAPITOLY, type Blok } from "@/lib/vize/kapitoly";

/**
 * Vize.
 *
 * Dlouhý text, takže má vlastní typografii: patnáct pixelů,
 * řádkování 1,8, šířka omezená na 66 znaků. Na širokém monitoru
 * by řádek jinak utíkal a oko by ztrácelo návaznost.
 */

export default function VizePanel() {
  const [aktivni, setAktivni] = useState(KAPITOLY[0].id);
  const [postup, setPostup] = useState(0);
  const telo = useRef<HTMLDivElement>(null);

  // Které kapitole odpovídá to, co je zrovna na obrazovce.
  useEffect(() => {
    const sleduj = () => {
      const el = telo.current;
      if (!el) return;

      const vyska = document.documentElement.scrollHeight - window.innerHeight;
      setPostup(vyska > 0 ? Math.min(100, (window.scrollY / vyska) * 100) : 0);

      for (const k of KAPITOLY) {
        const c = document.getElementById(`vize-${k.id}`);
        if (!c) continue;
        const r = c.getBoundingClientRect();
        // Kapitola je aktivní, dokud její konec nevyjede nad třetinu okna.
        if (r.top <= window.innerHeight / 3 && r.bottom > window.innerHeight / 3) {
          setAktivni(k.id);
          return;
        }
      }
    };

    sleduj();
    window.addEventListener("scroll", sleduj, { passive: true });
    return () => window.removeEventListener("scroll", sleduj);
  }, []);

  function skoc(id: string) {
    document.getElementById(`vize-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="vi-postup" style={{ width: `${postup}%` }} aria-hidden="true" />

      <div className="vi">
        <nav className="vi-obsah" aria-label="Kapitoly">
          {KAPITOLY.map((k, i) => (
            <button
              key={k.id}
              className={`vi-polozka ${aktivni === k.id ? "vi-polozka--on" : ""}`}
              onClick={() => skoc(k.id)}
            >
              <span className="data vi-cislo">{String(i + 1).padStart(2, "0")}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="vi-nazev">{k.nazev}</span>
                <span className="vi-perex">{k.perex}</span>
              </span>
            </button>
          ))}
        </nav>

        <div ref={telo} className="vi-telo">
          {KAPITOLY.map((k, i) => (
            <section key={k.id} id={`vize-${k.id}`} className="vi-kapitola">
              <div className="vi-hlava">
                <span className="vi-znak">
                  <i className={`ti ti-${k.ikona}`} aria-hidden="true" />
                </span>
                <span>
                  <span className="data vi-poradi">KAPITOLA {String(i + 1).padStart(2, "0")}</span>
                  <h2 className="vi-nadpis">{k.nazev}</h2>
                </span>
              </div>

              {k.bloky.map((b, j) => <Kus key={j} b={b} />)}
            </section>
          ))}

          <p className="vi-konec">
            Tenhle text není hotový dokument. Je to zápis toho, jak se na systém
            díváme teď — a má se měnit, jak se bude měnit firma.
          </p>
        </div>
      </div>
    </>
  );
}

function Kus({ b }: { b: Blok }) {
  if (b.typ === "nadpis") return <h3 className="vi-podnadpis">{b.obsah}</h3>;
  if (b.typ === "text") return <p className="vi-text">{b.obsah}</p>;

  if (b.typ === "zvyrazneni") {
    return (
      <p className="vi-zvyrazneni">
        <span className="vi-zvyrazneni__pruh" aria-hidden="true" />
        {b.obsah}
      </p>
    );
  }

  if (b.typ === "varovani") {
    return (
      <p className="vi-varovani">
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <span>{b.obsah}</span>
      </p>
    );
  }

  if (b.typ === "seznam") {
    return (
      <ul className="vi-seznam">
        {b.polozky.map((p, i) => (
          <li key={i}>
            <i className="ti ti-point-filled" aria-hidden="true" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (b.typ === "kroky") {
    return (
      <ol className="vi-kroky">
        {b.polozky.map((p, i) => (
          <li key={i}>
            <span className="data vi-krok-cislo">{i + 1}</span>
            <span>{p}</span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="vi-cisla">
      {b.polozky.map((p, i) => (
        <span key={i} className="vi-cislo-karta">
          <span className="vi-cislo-hodnota">{p.cislo}</span>
          <span className="vi-cislo-popis">{p.popis}</span>
        </span>
      ))}
    </div>
  );
}
