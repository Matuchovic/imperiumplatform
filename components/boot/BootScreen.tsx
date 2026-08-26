"use client";

import { useEffect, useRef, useState } from "react";
import ScaleField from "@/components/effects/ScaleField";

/** Tempo sekvence. Zvýšením se obrazovka prodlouží, snížením zkrátí. */
const INTRO_MS = 1200;
const STEP_MS = 420;
const OUTRO_MS = 420;

/** Kroky odpovídají tomu, co se PŘED přihlášením opravdu děje. */
const STEPS = [
  "Navazuji zabezpečené spojení",
  "Načítám systém",
  "Synchronizuji kurzy",
  "Kontroluji dostupnost knihoven",
  "Připravuji přihlášení",
];

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(-1);
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  function skip() {
    if (finished.current) return;
    finished.current = true;
    setLeaving(true);
    window.setTimeout(onDone, OUTRO_MS);
  }

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(skip, 300);
      return () => window.clearTimeout(t);
    }

    const timers: number[] = [];
    STEPS.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStep(i), INTRO_MS + i * STEP_MS));
    });
    timers.push(window.setTimeout(skip, INTRO_MS + STEPS.length * STEP_MS + 380));

    // Nápis o přeskočení tu záměrně není, ale úniková cesta zůstává.
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

  const pct = Math.round(((step + 1) / STEPS.length) * 96);

  return (
    <div
      className={`veil ${leaving ? "veil--out" : ""}`}
      onClick={skip}
      role="status"
      aria-live="polite"
      aria-busy={!leaving}
      aria-label="Systém se spouští"
    >
      <ScaleField direction="out" />
      <div className="veil__lift" aria-hidden="true" />
      <div className="veil__edge" aria-hidden="true" />

      <div className="veil__mid">
        <span className="veil__logo">
          <span style={{ color: "#7ef0a8" }}>BET</span>
          <span style={{ color: "#ffffff" }}>IMPERIUM</span>
        </span>
        <span className="veil__sub">Sázkový management</span>

        <ul className="veil__steps">
          {STEPS.map((label, i) => {
            const state = i < step ? "done" : i === step ? "run" : "wait";
            return (
              <li key={label} className={`veil__step veil__step--${state}`}>
                <span className="veil__ico">
                  <i
                    className={
                      state === "done"
                        ? "ti ti-check"
                        : state === "run"
                        ? "ti ti-loader-2 veil__spin"
                        : "ti ti-point"
                    }
                    aria-hidden="true"
                  />
                </span>
                {label}
              </li>
            );
          })}
        </ul>

        <div className="veil__bar">
          <div className="veil__bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
