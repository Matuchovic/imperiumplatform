"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KAPITOLY, PILIRE, type Blok } from "@/lib/vize/kapitoly";

/**
 * Vize.
 *
 * Dlouhý text s vlastní typografií — patnáct pixelů, řádkování 1,8,
 * šířka 66 znaků. Na širokém monitoru by řádek jinak utíkal.
 *
 * Obsah se odkrývá při rolování. Animace, která se přehraje jednou
 * a pak je ticho, čtení pomáhá; animace v každém rámci ruší.
 */

/** Odkryje prvek, jakmile se dostane do výřezu. Jednou, ne opakovaně. */
function useOdkryti<T extends HTMLElement>() {
  const prvek = useRef<T>(null);
  const [videt, setVidet] = useState(false);

  useEffect(() => {
    const el = prvek.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVidet(true);
      return;
    }

    const p = new IntersectionObserver(
      ([z]) => {
        if (z.isIntersecting) { setVidet(true); p.disconnect(); }
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    p.observe(el);
    return () => p.disconnect();
  }, []);

  return { prvek, videt };
}

export default function VizePanel() {
  const [aktivni, setAktivni] = useState("uvod");
  const [postup, setPostup] = useState(0);

  useEffect(() => {
    const sleduj = () => {
      const vyska = document.documentElement.scrollHeight - window.innerHeight;
      setPostup(vyska > 0 ? Math.min(100, (window.scrollY / vyska) * 100) : 0);

      const kotvy = ["uvod", "pilire", ...KAPITOLY.map((k) => k.id)];
      for (const id of kotvy) {
        const c = document.getElementById(`vize-${id}`);
        if (!c) continue;
        const r = c.getBoundingClientRect();
        if (r.top <= window.innerHeight / 3 && r.bottom > window.innerHeight / 3) {
          setAktivni(id);
          return;
        }
      }
    };

    sleduj();
    window.addEventListener("scroll", sleduj, { passive: true });
    return () => window.removeEventListener("scroll", sleduj);
  }, []);

  const skoc = useCallback((id: string) => {
    document.getElementById(`vize-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const obsah = [
    { id: "uvod", nazev: "Úvod", perex: "Co to je" },
    { id: "pilire", nazev: "Tři pilíře", perex: "Management, marketing, AI" },
    ...KAPITOLY.map((k) => ({ id: k.id, nazev: k.nazev, perex: k.perex })),
  ];

  return (
    <>
      <div className="vi-postup" style={{ width: `${postup}%` }} aria-hidden="true" />

      <div className="vi">
        <nav className="vi-obsah" aria-label="Obsah">
          {obsah.map((k, i) => (
            <button
              key={k.id}
              className={`vi-polozka ${aktivni === k.id ? "vi-polozka--on" : ""}`}
              onClick={() => skoc(k.id)}
            >
              <span className="data vi-cislo">{String(i).padStart(2, "0")}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="vi-nazev">{k.nazev}</span>
                <span className="vi-perex">{k.perex}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="vi-telo">
          <Uvod />
          <Pilire />
          {KAPITOLY.map((k, i) => (
            <Kapitola key={k.id} k={k} poradi={i + 1} />
          ))}

          <p className="vi-konec">
            Tohle není hotový dokument. Je to zápis toho, jak se na systém dívám teď —
            a má se měnit, jak se bude měnit firma.
          </p>
        </div>
      </div>
    </>
  );
}

/** Úvodní obrazovka. Jedna věta, která má zůstat v hlavě. */
function Uvod() {
  const { prvek, videt } = useOdkryti<HTMLElement>();

  return (
    <section id="vize-uvod" ref={prvek} className={`vi-uvod ${videt ? "vi--videt" : ""}`}>
      <span className="data vi-uvod__kicker">BETIMPERIUM · SYSTÉM</span>

      <h2 className="vi-uvod__nadpis">
        Postavil jsem <span className="vi-uvod__zvyraz">vlastní systém</span>,
        protože ten cizí nikdy nesedí přesně.
      </h2>

      <p className="vi-uvod__text">
        Tři věci, na kterých to stojí: mít pořádek v tom, co firma dělá,
        umět oslovit lidi, kteří o to stojí, a nechat co nejvíc práce
        na stroji. Zbytek je detail.
      </p>

      <p className="vi-uvod__podpis">
        <span className="vi-uvod__od">Ondřej Matucha</span>
        <span>vývoj · pro Denise</span>
      </p>

      <div className="vi-uvod__sipka" aria-hidden="true">
        <i className="ti ti-chevron-down" />
      </div>
    </section>
  );
}

/** Tři pilíře. Jádro celého dokumentu. */
function Pilire() {
  const { prvek, videt } = useOdkryti<HTMLElement>();

  return (
    <section id="vize-pilire" ref={prvek} className={`vi-pilire ${videt ? "vi--videt" : ""}`}>
      <span className="data vi-poradi">NA ČEM TO STOJÍ</span>
      <h2 className="vi-nadpis">Tři pilíře</h2>
      <p className="vi-text" style={{ marginBottom: 26 }}>
        Každý z nich by sám o sobě byl produkt. Dohromady dávají něco,
        co se nedá koupit jako předplatné.
      </p>

      {PILIRE.map((p, i) => (
        <PilirKarta key={p.cislo} p={p} zpozdeni={i * 120} />
      ))}
    </section>
  );
}

function PilirKarta({ p, zpozdeni }: { p: (typeof PILIRE)[number]; zpozdeni: number }) {
  const { prvek, videt } = useOdkryti<HTMLDivElement>();

  return (
    <div
      ref={prvek}
      className={`vi-pilir ${videt ? "vi--videt" : ""}`}
      style={{
        transitionDelay: `${zpozdeni}ms`,
        ["--barva" as string]: p.barva,
      }}
    >
      <div className="vi-pilir__hlava">
        <span className="vi-pilir__cislo">{p.cislo}</span>
        <span className="vi-pilir__znak">
          <i className={`ti ti-${p.ikona}`} aria-hidden="true" />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <h3 className="vi-pilir__nazev">{p.nazev}</h3>
          <p className="vi-pilir__podtitul">{p.podtitul}</p>
        </span>
      </div>

      <p className="vi-pilir__perex">{p.perex}</p>

      <div className="vi-pilir__body">
        {p.body.map((b, i) => (
          <div key={i} className="vi-bod">
            <span className="vi-bod__tecka" aria-hidden="true" />
            <span>
              <span className="vi-bod__nadpis">{b.nadpis}</span>
              <span className="vi-bod__text">{b.text}</span>
            </span>
          </div>
        ))}
      </div>

      <p className="vi-pilir__pointa">{p.pointa}</p>
    </div>
  );
}

function Kapitola({ k, poradi }: { k: (typeof KAPITOLY)[number]; poradi: number }) {
  const { prvek, videt } = useOdkryti<HTMLElement>();

  return (
    <section
      id={`vize-${k.id}`}
      ref={prvek}
      className={`vi-kapitola ${videt ? "vi--videt" : ""}`}
    >
      <div className="vi-hlava">
        <span className="vi-znak">
          <i className={`ti ti-${k.ikona}`} aria-hidden="true" />
        </span>
        <span>
          <span className="data vi-poradi">KAPITOLA {String(poradi).padStart(2, "0")}</span>
          <h2 className="vi-nadpis">{k.nazev}</h2>
        </span>
      </div>

      {k.bloky.map((b, j) => <Kus key={j} b={b} />)}
    </section>
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

  if (b.typ === "citat") {
    return (
      <blockquote className="vi-citat">
        <i className="ti ti-quote" aria-hidden="true" />
        <p>{b.obsah}</p>
        {b.autor && <cite>{b.autor}</cite>}
      </blockquote>
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
          <li key={i} style={{ transitionDelay: `${i * 60}ms` }}>
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
          <li key={i} style={{ transitionDelay: `${i * 60}ms` }}>
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
        <span key={i} className="vi-cislo-karta" style={{ transitionDelay: `${i * 80}ms` }}>
          <span className="vi-cislo-hodnota">{p.cislo}</span>
          <span className="vi-cislo-popis">{p.popis}</span>
        </span>
      ))}
    </div>
  );
}
