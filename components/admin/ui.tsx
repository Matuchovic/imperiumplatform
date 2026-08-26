import type { ReactNode } from "react";

/** Popisky jsou věty v běžném psaní. Mono jen na čísla, kde pomáhá zarovnání. */
export function Stat({
  label,
  value,
  unit,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const color =
    tone === "good" ? "#7ef0a8" : tone === "warn" ? "#ffc94a" : tone === "bad" ? "#ff6b6b" : "#5b6c61";

  return (
    <div className="adm-card">
      <p className="adm-card__label">{label}</p>
      <p className="data adm-card__value">
        {value}
        {unit && <span className="adm-card__unit">{unit}</span>}
      </p>
      {note && (
        <p className="data adm-card__note" style={{ color }}>
          {note}
        </p>
      )}
    </div>
  );
}

export function Panel({
  title,
  lead,
  children,
}: {
  title?: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section className="adm-panel">
      {title && <h2 className="adm-panel__title">{title}</h2>}
      {lead && <p className="adm-panel__lead">{lead}</p>}
      {children}
    </section>
  );
}

export function Alert({
  tone,
  title,
  detail,
  action,
}: {
  tone: "bad" | "warn";
  title: string;
  detail: string;
  action: string;
}) {
  return (
    <div className={`adm-alert adm-alert--${tone}`}>
      <span className="adm-alert__text">
        <span className="adm-alert__title">{title}</span>{" "}
        <span className="adm-alert__detail">{detail}</span>
      </span>
      <button className={`adm-alert__btn adm-alert__btn--${tone}`}>{action}</button>
    </div>
  );
}

export function Row({
  label,
  value,
  tone = "neutral",
  meta,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
  meta?: string;
}) {
  const color =
    tone === "good" ? "#7ef0a8" : tone === "warn" ? "#ffd88a" : tone === "bad" ? "#ffb4b4" : "#cfe6d8";
  return (
    <div className="adm-row">
      <span className="adm-row__label" style={{ color }}>
        {label}
      </span>
      <span className="data adm-row__value">
        {value}
        {meta && <span className="adm-row__meta"> · {meta}</span>}
      </span>
    </div>
  );
}
