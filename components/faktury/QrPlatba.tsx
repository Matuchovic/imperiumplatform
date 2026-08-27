"use client";

import { useEffect, useRef, useState } from "react";
import { spd, type Platba } from "@/lib/faktury/spd";

/**
 * QR kód pro platbu.
 *
 * Knihovna se načte z CDN až při prvním zobrazení. V balíčku by
 * zabírala místo i těm, kdo faktury neotvírají — a to je většina.
 */

const QRLIB = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js";

declare global {
  interface Window {
    QRCode?: {
      toCanvas: (c: HTMLCanvasElement, t: string, o: unknown, cb: (e?: Error) => void) => void;
    };
  }
}

function nactiKnihovnu(): Promise<void> {
  if (window.QRCode) return Promise.resolve();
  return new Promise((hotovo, chyba) => {
    const s = document.createElement("script");
    s.src = QRLIB;
    s.onload = () => hotovo();
    s.onerror = () => chyba(new Error("Knihovnu pro QR se nepodařilo načíst."));
    document.head.appendChild(s);
  });
}

export default function QrPlatba({ platba, velikost = 148 }: { platba: Platba; velikost?: number }) {
  const platno = useRef<HTMLCanvasElement>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  useEffect(() => {
    const retezec = spd(platba);
    if (!retezec) { setChyba("Číslo účtu není platné."); return; }

    let zruseno = false;
    nactiKnihovnu()
      .then(() => {
        if (zruseno || !platno.current || !window.QRCode) return;
        window.QRCode.toCanvas(
          platno.current,
          retezec,
          {
            width: velikost,
            margin: 1,
            // Bílý podklad je nutný — čtečky na tmavém pozadí selhávají.
            color: { dark: "#04140a", light: "#ffffff" },
            errorCorrectionLevel: "M",
          },
          (e) => { if (e && !zruseno) setChyba("QR kód se nepodařilo vykreslit."); }
        );
      })
      .catch((e) => !zruseno && setChyba(String(e.message)));

    return () => { zruseno = true; };
  }, [platba, velikost]);

  if (chyba) {
    return <p className="fa-qr__chyba">{chyba}</p>;
  }

  return (
    <span className="fa-qr">
      <canvas ref={platno} width={velikost} height={velikost} aria-label="QR kód pro platbu" />
      <span className="data fa-qr__popis">Naskenuj v bance</span>
    </span>
  );
}
