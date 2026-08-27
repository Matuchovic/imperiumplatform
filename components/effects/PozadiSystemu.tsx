"use client";

import { useEffect, useRef } from "react";

/**
 * Pozadí přihlašovacích obrazovek.
 *
 * Rozostřený náznak samotného systému — karty s hodnotami, grafy,
 * tabulky, měřidla. Přihlášení je dveře, za kterými prosvítá to,
 * do čeho uživatel vstupuje.
 *
 * Proti fotografii má tři výhody: nestahuje se žádný soubor, škáluje
 * na jakoukoli velikost bez rozmazání a je živé natolik, aby to
 * nepřekáželo při psaní hesla.
 */

type Druh = "karta" | "sloupce" | "cara" | "tabulka" | "mericko";
const DRUHY: Druh[] = ["karta", "sloupce", "cara", "tabulka", "mericko"];

type Panel = {
  x: number; y: number; w: number; h: number;
  druh: Druh;
  /** Hloubka řídí jas i rychlost — vzdálenější plují pomaleji. */
  d: number;
  faze: number;
  data: number[];
};

export default function PozadiSystemu() {
  const platno = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = platno.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;

    const tlumit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, raf = 0, panely: Panel[] = [], t0 = performance.now();

    function postav() {
      W = window.innerWidth;
      H = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c!.width = Math.floor(W * dpr);
      c!.height = Math.floor(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const pocet = W < 560 ? 7 : W < 1100 ? 11 : 16;
      panely = Array.from({ length: pocet }, (_, i) => ({
        x: Math.random() * (W + 220) - 110,
        y: Math.random() * (H + 180) - 90,
        w: 130 + Math.random() * 150,
        h: 80 + Math.random() * 95,
        druh: DRUHY[i % DRUHY.length],
        d: 0.35 + Math.random() * 0.65,
        faze: Math.random() * Math.PI * 2,
        data: Array.from({ length: 12 }, () => 0.25 + Math.random() * 0.75),
      }));
    }

    function panel(p: Panel, t: number) {
      const drift = Math.sin(t * 0.14 + p.faze) * 9 * p.d;
      const x = p.x;
      const y = p.y + drift;
      const a = 0.05 + p.d * 0.07;
      const vnitrni = `rgba(126,240,168,${(a * 1.5).toFixed(3)})`;
      const pad = 13;

      ctx!.strokeStyle = `rgba(126,240,168,${a.toFixed(3)})`;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.roundRect(x, y, p.w, p.h, 9);
      ctx!.stroke();
      ctx!.fillStyle = `rgba(126,240,168,${(a * 0.16).toFixed(3)})`;
      ctx!.fill();

      if (p.druh === "sloupce") {
        const s = (p.w - pad * 2) / p.data.length - 3;
        p.data.forEach((v, i) => {
          const vys = (p.h - pad * 2 - 14) * v;
          ctx!.fillStyle = vnitrni;
          ctx!.fillRect(x + pad + i * (s + 3), y + p.h - pad - vys, s, vys);
        });
      } else if (p.druh === "cara") {
        ctx!.strokeStyle = vnitrni;
        ctx!.beginPath();
        p.data.forEach((v, i) => {
          const px = x + pad + (i / (p.data.length - 1)) * (p.w - pad * 2);
          const py = y + p.h - pad - (p.h - pad * 2 - 14) * v;
          i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
        });
        ctx!.stroke();
      } else if (p.druh === "tabulka") {
        ctx!.fillStyle = vnitrni;
        for (let i = 0; i < 5; i++) {
          const ry = y + pad + 6 + i * 13;
          if (ry > y + p.h - pad) break;
          ctx!.fillRect(x + pad, ry, (p.w - pad * 2) * (0.4 + p.data[i] * 0.5), 3);
        }
      } else if (p.druh === "mericko") {
        const cx = x + p.w / 2;
        const cy = y + p.h / 2 + 4;
        const r = Math.min(p.w, p.h) * 0.28;
        ctx!.strokeStyle = `rgba(126,240,168,${(a * 0.8).toFixed(3)})`;
        ctx!.lineWidth = 4;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
        ctx!.stroke();
        ctx!.strokeStyle = vnitrni;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * p.data[0]);
        ctx!.stroke();
        ctx!.lineWidth = 1;
      } else {
        ctx!.fillStyle = vnitrni;
        ctx!.fillRect(x + pad, y + pad, p.w * 0.4, 4);
        ctx!.fillRect(x + pad, y + pad + 16, p.w * 0.55, 10);
        ctx!.fillRect(x + pad, y + pad + 34, p.w * 0.3, 4);
      }
    }

    function kresli(now: number) {
      ctx!.clearRect(0, 0, W, H);
      const t = (now - t0) / 1000;
      for (const p of panely) panel(p, t);
      raf = requestAnimationFrame(kresli);
    }

    postav();
    if (tlumit) kresli(performance.now());
    else raf = requestAnimationFrame(kresli);

    let rt: number;
    const priZmene = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(postav, 200);
    };
    // Na skryté kartě nemá smysl kreslit — šetří to baterii.
    const priSkryti = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !tlumit) {
        t0 = performance.now();
        raf = requestAnimationFrame(kresli);
      }
    };

    window.addEventListener("resize", priZmene);
    document.addEventListener("visibilitychange", priSkryti);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(rt);
      window.removeEventListener("resize", priZmene);
      document.removeEventListener("visibilitychange", priSkryti);
    };
  }, []);

  return <canvas ref={platno} className="page-bg__platno" aria-hidden="true" />;
}
