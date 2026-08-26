"use client";

import { useEffect, useRef, useState } from "react";
import ScaleField from "@/components/effects/ScaleField";
import Veil from "@/components/effects/Veil";
import { ACCOUNT, goalPct } from "@/lib/data";

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
  const [tiles, setTiles] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  const steps = [
    { label: "Historie tiketů", meta: String(ACCOUNT.ticketsTotal), warn: false },
    { label: "Přepočet bankrollu", meta: `${ACCOUNT.bankroll.toLocaleString("cs-CZ")} Kč`, warn: false },
    { label: "Otevřené tikety", meta: `${ACCOUNT.openTickets} čekají`, warn: ACCOUNT.openTickets > 0 },
    { label: "Telegram napojen", meta: "aktivní", warn: false },
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
    timers.push(window.setTimeout(() => setTiles(true), after));
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

        <div className={`veil__tiles ${tiles ? "veil__tiles--in" : ""}`}>
          <div className="veil__tile">
            <p className="veil__tile-k">BANKROLL</p>
            <p className="data veil__tile-v">{ACCOUNT.bankroll.toLocaleString("cs-CZ")}</p>
          </div>
          <div className="veil__tile">
            <p className="veil__tile-k">ROI</p>
            <p className="data veil__tile-v" style={{ color: "#7ef0a8" }}>
              +{ACCOUNT.roi.toString().replace(".", ",")} %
            </p>
          </div>
          <div className="veil__tile">
            <p className="veil__tile-k">CÍL</p>
            <p className="data veil__tile-v">{goalPct()} %</p>
          </div>
        </div>
      </div>
    </div>
    </Veil>
  );
}
