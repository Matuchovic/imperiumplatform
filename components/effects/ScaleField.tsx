"use client";

import { useEffect, useRef } from "react";

/**
 * Pole šupin s vlnou, kreslené na jedno plátno.
 *
 * Předchozí verze měla ~250 DOM prvků a animovala u nich `border-color`
 * a `filter: blur()`. Ani jedno nejede na kompozitoru — prohlížeč musel
 * každý snímek znovu překreslit a rozostřit každý prvek zvlášť. Odtud
 * to sekání. Plátno kreslí totéž v jedné smyčce: bez přepočtu stylů,
 * bez rozvržení a bez invalidace zbytku stránky.
 */
export default function ScaleField({
  direction = "out",
}: {
  direction?: "out" | "in";
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    type Scale = { x: number; y: number; r: number; phase: number; deep: boolean; angle: number };
    let scales: Scale[] = [];
    let dpr = 1;
    let raf = 0;
    let resizeTimer = 0;

    const CYCLE = direction === "in" ? 5.4 : 4.8;
    const SPEED = direction === "in" ? 0.0046 : 0.005;

    function layout() {
      const host = canvas!.parentElement;
      if (!host) return;
      const W = host.clientWidth;
      const H = host.clientHeight;
      if (!W || !H) return;

      // Nad dvojnásobek hustoty pixelů nemá smysl jít — rozdíl není vidět
      // a plocha k překreslení roste s druhou mocninou.
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(W * dpr);
      canvas!.height = Math.floor(H * dpr);
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const SIZE = W < 640 ? 58 : 46;
      const STEP_Y = SIZE * 0.5;
      const cx = W / 2;
      const cy = H * (direction === "in" ? 0.46 : 0.44);
      const rx = W * 0.3;
      const ry = H * 0.29;
      const maxD = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));

      const cols = Math.ceil(W / SIZE) + 2;
      const rows = Math.ceil(H / STEP_Y) + 2;

      const next: Scale[] = [];
      for (let r = 0; r < rows; r++) {
        const offset = r % 2 ? SIZE / 2 : 0;
        for (let c = 0; c < cols; c++) {
          const x = c * SIZE + offset;
          const y = r * STEP_Y;
          const dx = x - cx;
          const dy = y - cy;

          // Uvnitř středové elipsy se nekreslí — text tam musí být čitelný.
          if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1) continue;

          const dist = Math.hypot(dx, dy);
          const travel = direction === "in" ? maxD - dist : dist;
          next.push({
            x,
            y,
            r: SIZE * 0.42,
            phase: (travel * SPEED) % CYCLE,
            deep: (r * 7 + c * 13) % 3 === 0,
            // Rozmáznutí míří po směru šíření vlny, ne nahodile.
            angle: Math.atan2(dy, dx),
          });
        }
      }
      scales = next;
    }

    /*
     * Vlna má tři fáze. Nejdřív dorazí rozmazaný pás, který šupinu
     * roztáhne po směru šíření. Pak se roztažení stáhne a šupina se
     * ukáže ostrá. Nakonec pomalu zhasne, než přijde další vlna.
     *
     * p = 0 v okamžiku, kdy k šupině vlna dorazí.
     */

    /** Roztažení — nejsilnější na náběžné hraně, do 22 % cyklu zmizí. */
    function smear(p: number) {
      return p < 0.22 ? 1 - p / 0.22 : 0;
    }

    /** Viditelnost — rychlý náběh, výdrž, pomalé doznění. */
    function reveal(p: number) {
      if (p < 0.09) return p / 0.09;
      if (p < 0.42) return 1;
      return Math.max(0, 1 - (p - 0.42) / 0.5);
    }

    function draw(nowMs: number) {
      const W = canvas!.width / dpr;
      const H = canvas!.height / dpr;
      ctx!.clearRect(0, 0, W, H);

      const t = nowMs / 1000;

      for (let i = 0; i < scales.length; i++) {
        const s = scales[i];
        const p = ((t + s.phase) % CYCLE) / CYCLE;

        const sm = smear(p);
        const rv = reveal(p);

        // Klidový stav — pole nesmí mezi vlnami zmizet úplně.
        const base = s.deep ? 0.03 : 0.045;
        const peak = s.deep ? 0.46 : 0.56;
        const alpha = base + (peak - base) * rv;
        if (alpha < 0.02) continue;

        const stretch = 1 + 2.1 * sm;
        const radius = s.r * (1 + 0.06 * rv);

        ctx!.lineWidth = s.deep ? 1.8 - 0.8 * rv : 1;
        ctx!.strokeStyle = s.deep
          ? "rgba(170,250,208," + alpha + ")"
          : "rgba(150,245,195," + alpha + ")";

        if (stretch > 1.04) {
          // Rozmáznutí místo gaussiánu: šupina se natáhne po směru vlny.
          // Oko to čte jako pohybovou neostrost a stojí to zlomek.
          ctx!.save();
          ctx!.translate(s.x, s.y);
          ctx!.rotate(s.angle);
          ctx!.scale(stretch, 1);
          ctx!.beginPath();
          ctx!.arc(0, 0, radius, 0, Math.PI);
          ctx!.stroke();
          ctx!.restore();
        } else {
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, radius, 0, Math.PI);
          ctx!.stroke();
        }
      }
    }

    function loop(now: number) {
      draw(now);
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (!raf) raf = requestAnimationFrame(loop);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    layout();
    if (reduced) draw(0);
    else start();

    // Na skryté kartě není co kreslit — smyčka by jen brala baterii.
    const onVisibility = () => {
      if (document.hidden || reduced) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        layout();
        if (reduced) draw(0);
      }, 180);
    };
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [direction]);

  return (
    <div className="sf" aria-hidden="true">
      <canvas ref={ref} className="sf__canvas" />
    </div>
  );
}
