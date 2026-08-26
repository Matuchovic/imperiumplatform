"use client";

import { useEffect, useRef, useState } from "react";
import ScaleField from "@/components/effects/ScaleField";
import Veil from "@/components/effects/Veil";

const INTRO_MS = 900;
const STEP_MS = 380;
const TILES_MS = 460;
const OUTRO_MS = 420;

export default function WelcomeScreen({
  name,
  plan,
  onDone,
}: {
  name: string;
  plan: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState(-1);
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  // Uvítání nesmí ukazovat čísla — ta se načtou až v přehledu.
  // Vymyšlený bankroll na první obrazovce po přihlášení je to
  // poslední, co si má klient zapamatovat.
  const steps = [
    { label: "Ověřuji účet", meta: "hotovo", warn: false },
    { label: "Načítám historii tiketů", meta: "hotovo", warn: false },
    { label: "Přepočítávám bankroll", meta: "hotovo", warn: false },
    { label: "Připravuji přehled", meta: "hotovo", warn: false },
  ];

  function skip() {
    if (finished.current) return;
    finished.current = true;
    setLeaving(true);
    window.setTimeout(onDone, OUTRO_MS);
  }

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(skip, 400);
      return () => window.clearTimeout(t);
    }

    const timers: number[] = [];
    steps.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStep(i), INTRO_MS + i * STEP_MS));
    });
    const after = INTRO_MS + steps.length * STEP_MS;
    timers.push(window.setTimeout(skip, after + TILES_MS));

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

  const pct = Math.round((Math.max(0, step + 1) / steps.length) * 100);

  return (
    <Veil>
    <div
      className={`veil ${leaving ? "veil--out" : ""}`}
      onClick={skip}
      role="status"
      aria-live="polite"
      aria-busy={!leaving}
      aria-label={`Vítejte v systému, ${name}`}
    >
      <ScaleField direction="in" />
      <div className="veil__lift" aria-hidden="true" />
      <div className="veil__edge" aria-hidden="true" />

      <div className="veil__mid">
        <span className="veil__mark">
          <span style={{ color: "#7ef0a8" }}>BET</span>
          <span style={{ color: "#ecfdf2" }}>IMPERIUM</span>
        </span>

        <span className="veil__eyebrow">Vítejte v systému</span>
        <h1 className="veil__name">{name}</h1>
        <span className="veil__sub">Plán {plan}</span>

        <ul className="veil__steps veil__steps--data">
          {steps.map((s, i) => {
            const state = i <= step ? (s.warn ? "warn" : "done") : "wait";
            return (
              <li key={s.label} className={`veil__step veil__step--${state}`}>
                <span className="veil__tag">
                  {state === "wait" ? "[--]" : state === "warn" ? "[!]" : "[ok]"}
                </span>
                <span className="veil__label">{s.label}</span>
                <span className="veil__meta">{state === "wait" ? "…" : s.meta}</span>
              </li>
            );
          })}
        </ul>

        <div className="veil__bar">
          <div className="veil__bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
    </Veil>
  );
}
