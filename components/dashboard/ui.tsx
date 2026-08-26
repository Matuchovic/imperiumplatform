import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-1 text-[26px] font-semibold text-chalk">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl ${className}`}
      style={{ background: "rgba(12,19,16,0.7)", border: "1px solid rgba(126,240,168,0.1)" }}
    >
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  unit,
  delta,
  positive = true,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  positive?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "rgba(12,19,16,0.7)", border: "1px solid rgba(126,240,168,0.1)" }}
    >
      <p className="eyebrow">{label}</p>
      <p className="data mt-2.5 text-[28px] font-semibold leading-none text-chalk">
        {value}
        {unit && <span className="ml-1 text-[14px] font-normal text-ash">{unit}</span>}
      </p>
      {delta && (
        <p className="data mt-2 text-[12px]" style={{ color: positive ? "#7ef0a8" : "#ff6b6b" }}>
          {delta}
        </p>
      )}
    </div>
  );
}

const STATE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  live: { label: "Živě", color: "#ffc94a", bg: "rgba(255,201,74,0.12)" },
  won: { label: "Výhra", color: "#7ef0a8", bg: "rgba(126,240,168,0.12)" },
  lost: { label: "Prohra", color: "#ff6b6b", bg: "rgba(255,107,107,0.12)" },
  void: { label: "Zrušeno", color: "#8fa396", bg: "rgba(143,163,150,0.12)" },
};

export function StateBadge({ state }: { state: string }) {
  const s = STATE_STYLE[state] ?? STATE_STYLE.void;
  return (
    <span className="data rounded-md px-2 py-1 text-[11px]" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

export function Sparkline({ points, height = 160 }: { points: number[]; height?: number }) {
  const w = 640;
  const h = height;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const step = w / (points.length - 1);
  const d = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(
          h - ((p - min) / (max - min)) * (h - 16) - 8
        ).toFixed(1)}`
    )
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ height, width: "100%", display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(126,240,168,0.28)" />
          <stop offset="100%" stopColor="rgba(126,240,168,0)" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="url(#sparkFill)" />
      <path
        d={d}
        fill="none"
        stroke="#7ef0a8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 8px rgba(126,240,168,0.5))" }}
      />
    </svg>
  );
}

export function Disclaimer() {
  return (
    <p className="mt-6 text-[11.5px] leading-relaxed text-ash-2/80">
      Uvedené hodnoty jsou historické výsledky a nepředstavují záruku budoucích výnosů.
      Sázej jen částky, o které si můžeš dovolit přijít. 18+
    </p>
  );
}
