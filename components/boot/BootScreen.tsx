"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Úvodní boot systému. Kroky odpovídají tomu, co se PŘED přihlášením
 * opravdu děje — žádná data uživatele, ta systém ještě nesmí znát.
 */
const STEPS = [
  { label: "Navazuji zabezpečené spojení", meta: "TLS" },
  { label: "Načítám systém", meta: "v2.4.1" },
  { label: "Synchronizuji kurzy", meta: "6 zdrojů" },
  { label: "Připravuji přihlášení", meta: "" },
];

const STEP_MS = 260;
const INTRO_MS = 900;
const OUTRO_MS = 420;

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(-1);
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  // Přeskočení musí být možné vždycky — animace nesmí být překážka.
  function skip() {
    if (finished.current) return;
    finished.current = true;
    setLeaving(true);
    window.setTimeout(onDone, OUTRO_MS);
  }

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const t = window.setTimeout(skip, 300);
      return () => window.clearTimeout(t);
    }

    const timers: number[] = [];
    STEPS.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStep(i), INTRO_MS + i * STEP_MS));
    });
    timers.push(window.setTimeout(skip, INTRO_MS + STEPS.length * STEP_MS + 260));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") skip();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.min(100, Math.round(((step + 1) / STEPS.length) * 100));

  return (
    <div
      className={`boot ${leaving ? "boot--out" : ""}`}
      onClick={skip}
      role="status"
      aria-live="polite"
      aria-busy={!leaving}
      aria-label="Systém se spouští"
    >
      <div className="boot__grid" aria-hidden="true" />
      <div className="boot__scan" aria-hidden="true" />

      <div className="boot__meta boot__meta--top">
        <span>BETIMPERIUM · CONTROL</span>
        <span>v2.4.1</span>
      </div>

      <div className="boot__center">
        <div className="boot__logo-wrap">
          <span className="boot__ghost boot__ghost--r" aria-hidden="true">BETIMPERIUM</span>
          <span className="boot__ghost boot__ghost--c" aria-hidden="true">BETIMPERIUM</span>
          <span className="boot__logo">
            <span style={{ color: "#7ef0a8" }}>BET</span>
            <span style={{ color: "#f2fff7" }}>IMPERIUM</span>
          </span>
        </div>

        <p className="boot__tagline">Systém sázkového poradenství</p>

        <ul className="boot__list">
          {STEPS.map((s, i) => {
            const state = i < step ? "ok" : i === step ? "run" : "wait";
            return (
              <li key={s.label} className={`boot__row boot__row--${state}`}>
                <span className="boot__tag">
                  {state === "ok" ? "[ok]" : state === "run" ? "[··]" : "[--]"}
                </span>
                <span className="boot__label">{s.label}</span>
                <span className="boot__meta-cell">{state === "wait" ? "čeká" : s.meta}</span>
              </li>
            );
          })}
        </ul>

        <div className="boot__bar">
          <div className="boot__bar-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="boot__readout">
          <span className="data">{pct} %</span>
          <span>PŘESKOČIT ⏎</span>
        </div>
      </div>

      <div className="boot__meta boot__meta--bottom">
        <span>NODE PRG-01</span>
        <span>ŠIFROVÁNO</span>
      </div>

      <div className="boot__lines" aria-hidden="true" />
      <div className="boot__vignette" aria-hidden="true" />
    </div>
  );
}
