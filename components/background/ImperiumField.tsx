/**
 * ImperiumField — ambientní pozadí přihlašovací obrazovky.
 *
 * Signature prvek: equity křivka, která se sama vykresluje. Je to nejtypičtější
 * artefakt celého oboru — a je záměrně kreslená z rovných úseků včetně propadů,
 * ne jako hladká marketingová šipka nahoru.
 *
 * Všechny hodnoty jsou staticky dané (žádný Math.random v renderu), aby na
 * serveru i klientu vznikl identický strom a nedošlo k hydration mismatch.
 */

const CHIPS = [
  { t: "1.85",         l: "7%",  b: "12%", d: 26, delay: 0,   x: "34px",  depth: "far",  peak: 0.3 },
  { t: "O 2.5",        l: "17%", b: "4%",  d: 32, delay: 6,   x: "-22px", depth: "mid",  peak: 0.5 },
  { t: "ROI +12.4 %",  l: "5%",  b: "38%", d: 38, delay: 12,  x: "18px",  depth: "near", peak: 0.7 },
  { t: "2.40",         l: "26%", b: "24%", d: 29, delay: 3,   x: "-30px", depth: "far",  peak: 0.3 },
  { t: "AH -0.5",      l: "36%", b: "6%",  d: 35, delay: 17,  x: "26px",  depth: "mid",  peak: 0.5 },
  { t: "BTTS",         l: "48%", b: "16%", d: 31, delay: 9,   x: "-16px", depth: "far",  peak: 0.28 },
  { t: "1.72",         l: "60%", b: "3%",  d: 27, delay: 21,  x: "20px",  depth: "mid",  peak: 0.5 },
  { t: "−1 jed.",      l: "69%", b: "30%", d: 34, delay: 5,   x: "-24px", depth: "mid",  peak: 0.42, loss: true },
  { t: "+EV 4.2 %",    l: "78%", b: "10%", d: 40, delay: 14,  x: "14px",  depth: "near", peak: 0.72 },
  { t: "Yield 8.1 %",  l: "88%", b: "34%", d: 36, delay: 25,  x: "-18px", depth: "mid",  peak: 0.5 },
  { t: "3.10",         l: "93%", b: "8%",  d: 28, delay: 11,  x: "22px",  depth: "far",  peak: 0.3 },
  { t: "Over 224.5",   l: "42%", b: "42%", d: 42, delay: 19,  x: "-12px", depth: "far",  peak: 0.26 },
];

/** Rovné úseky = reálná equity křivka, včetně dvou zřetelných drawdownů. */
const CURVE =
  "M -40 742 L 62 716 L 148 730 L 236 672 L 322 690 L 408 626 L 494 654 " +
  "L 580 592 L 666 614 L 752 540 L 838 572 L 924 496 L 1010 524 L 1096 438 " +
  "L 1182 462 L 1268 382 L 1354 404 L 1440 322 L 1520 340";

export default function ImperiumField() {
  return (
    <div className="field" aria-hidden="true">
      <div className="aurora aurora--a" />
      <div className="aurora aurora--b" />
      <div className="aurora aurora--c" />

      <div className="raster" />

      <svg
        className="equity"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          <linearGradient id="equityStroke" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="45%" stopColor="#7ef0a8" />
            <stop offset="100%" stopColor="#5eead4" />
          </linearGradient>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(126,240,168,0.20)" />
            <stop offset="100%" stopColor="rgba(126,240,168,0)" />
          </linearGradient>
          <path id="curvePath" d={CURVE} />
        </defs>

        {/* stopa předchozího průchodu — drží kompozici i než se křivka vykreslí */}
        <path className="equity__ghost" d={CURVE} />
        <path className="equity__fill" d={`${CURVE} L 1520 900 L -40 900 Z`} />
        <path className="equity__line" d={CURVE} />

        <circle className="equity__head" r="3.5">
          <animateMotion dur="18s" repeatCount="indefinite" keyPoints="0;1;1;1"
            keyTimes="0;0.62;0.88;1" calcMode="linear">
            <mpath href="#curvePath" />
          </animateMotion>
          <animate attributeName="opacity" dur="18s" repeatCount="indefinite"
            values="0;1;1;0;0" keyTimes="0;0.06;0.62;0.7;1" />
        </circle>
      </svg>

      {CHIPS.map((c) => (
        <span
          key={c.t + c.l}
          className={`chip chip--${c.depth}${c.loss ? " chip--loss" : ""}`}
          style={
            {
              left: c.l,
              bottom: c.b,
              animationDuration: `${c.d}s`,
              animationDelay: `-${c.delay}s`,
              "--chip-x": c.x,
              "--chip-peak": c.peak,
            } as React.CSSProperties
          }
        >
          {c.t}
        </span>
      ))}

      <div className="grain" />
      <div className="vignette" />
    </div>
  );
}
