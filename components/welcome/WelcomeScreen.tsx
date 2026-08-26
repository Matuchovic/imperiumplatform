"use client";

import { useEffect, useRef, useState } from "react";
import { ACCOUNT, goalPct } from "@/lib/data";

/** Tempo sekvence. Zvýšením se obrazovka prodlouží, snížením zkrátí. */
const INTRO_MS = 900;
const STEP_MS = 340;
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
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const t = window.setTimeout(skip, 400);
      return () => window.clearTimeout(t);
    }

    const timers: number[] = [];
    steps.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStep(i), INTRO_MS + i * STEP_MS));
    });
    const afterSteps = INTRO_MS + steps.length * STEP_MS;
    timers.push(window.setTimeout(() => setTiles(true), afterSteps));
    timers.push(window.setTimeout(skip, afterSteps + TILES_MS));

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

  const done = Math.max(0, step + 1);
  const pct = Math.round((done / steps.length) * 100);

  return (
    <div
      className={`wel ${leaving ? "wel--out" : ""}`}
      onClick={skip}
      role="status"
      aria-live="polite"
      aria-busy={!leaving}
      aria-label={`Vítejte v systému, ${name}`}
    >
      <div className="wel__grid" aria-hidden="true" />
      <div className="wel__scan" aria-hidden="true" />

      <div className="boot__meta boot__meta--top">
        <span>BETIMPERIUM · CONTROL</span>
        <span>PŘIHLÁŠENO</span>
      </div>

      <div className="wel__center">
        <p className="wel__eyebrow">Vítejte v systému</p>

        <div className="wel__name-wrap">
          <h1 className="wel__name">{name}</h1>
          <span className="wel__sweep" aria-hidden="true" />
        </div>

        <p className="wel__sub">Plán {plan}</p>

        <ul className="wel__list">
          {steps.map((s, i) => {
            const state = i <= step ? (s.warn ? "warn" : "ok") : "wait";
            return (
              <li key={s.label} className={`boot__row boot__row--${state === "warn" ? "run" : state}`}>
                <span className="boot__tag">
                  {state === "wait" ? "[--]" : state === "warn" ? "[!]" : "[ok]"}
                </span>
                <span className="boot__label">{s.label}</span>
                <span className="boot__meta-cell" style={state === "warn" ? { color: "#ffc94a" } : undefined}>
                  {state === "wait" ? "…" : s.meta}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="boot__bar" style={{ marginTop: 20 }}>
          <div className="boot__bar-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className={`wel__tiles ${tiles ? "wel__tiles--in" : ""}`}>
          <div className="wel__tile">
            <p className="wel__tile-label">BANKROLL</p>
            <p className="wel__tile-value">{ACCOUNT.bankroll.toLocaleString("cs-CZ")}</p>
          </div>
          <div className="wel__tile">
            <p className="wel__tile-label">ROI</p>
            <p className="wel__tile-value" style={{ color: "#7ef0a8" }}>
              +{ACCOUNT.roi.toString().replace(".", ",")} %
            </p>
          </div>
          <div className="wel__tile">
            <p className="wel__tile-label">CÍL</p>
            <p className="wel__tile-value">{goalPct()} %</p>
          </div>
        </div>
      </div>

      <div className="boot__meta boot__meta--bottom">
        <span>OTEVÍRÁM PŘEHLED</span>
        <span>PŘESKOČIT ⏎</span>
      </div>

      <div className="boot__lines" aria-hidden="true" />
      <div className="boot__vignette" aria-hidden="true" />
    </div>
  );
}
