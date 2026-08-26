"use client";

import { useEffect, useRef } from "react";

/**
 * Pole šupin s vlnou. Zpoždění každé šupiny se počítá z její vzdálenosti
 * od středu — tím vzniká hřeben, který postupuje jako kruh po hladině.
 *
 *   direction="out" — vlna se šíří ze středu ven (start systému)
 *   direction="in"  — vlna se sbíhá zvenku dovnitř (uvítání)
 *
 * Uvnitř středové elipsy se šupiny vůbec nevytvářejí. Nejde jen o čistý
 * střed pod textem: ušetří to kolem dvou set animovaných prvků.
 */
export default function ScaleField({
  direction = "out",
}: {
  direction?: "out" | "in";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer = 0;

    const build = () => {
      const W = host.clientWidth;
      const H = host.clientHeight;
      host.replaceChildren();
      if (!W || !H) return;

      const narrow = W < 640;
      // Na užší obrazovce větší šupiny = méně prvků k animování.
      const SIZE = narrow ? 58 : 46;
      const STEP_Y = SIZE * 0.5;
      const CYCLE = direction === "in" ? 5.4 : 4.8;
      const SPEED = direction === "in" ? 0.0046 : 0.005;

      const cx = W / 2;
      const cy = H * (direction === "in" ? 0.46 : 0.44);
      const rx = W * 0.3;
      const ry = H * 0.29;

      const maxD = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));

      const cols = Math.ceil(W / SIZE) + 2;
      const rows = Math.ceil(H / STEP_Y) + 2;
      const frag = document.createDocumentFragment();

      for (let r = 0; r < rows; r++) {
        const offset = r % 2 ? SIZE / 2 : 0;
        for (let c = 0; c < cols; c++) {
          const x = c * SIZE - SIZE / 2 + offset;
          const y = r * STEP_Y - SIZE / 2;
          const dx = x + SIZE / 2 - cx;
          const dy = y + SIZE / 2 - cy;

          if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1) continue;

          const el = document.createElement("span");
          el.className = "sf__sc";
          // Rozostření je drahé, proto jen na třetině — a na mobilu vůbec.
          if (!narrow && (r * 7 + c * 13) % 3 === 0) el.classList.add("sf__sc--deep");

          el.style.cssText =
            `left:${x}px;top:${y}px;width:${SIZE}px;height:${SIZE}px`;

          const dist = Math.hypot(dx, dy);
          const travel = direction === "in" ? maxD - dist : dist;
          el.style.animationDelay = `-${(CYCLE - ((travel * SPEED) % CYCLE)).toFixed(2)}s`;

          frag.appendChild(el);
        }
      }
      host.appendChild(frag);
    };

    build();

    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(build, 220);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      host.replaceChildren();
    };
  }, [direction]);

  return <div ref={ref} className="sf" aria-hidden="true" />;
}
