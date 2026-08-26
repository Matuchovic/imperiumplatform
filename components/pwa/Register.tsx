"use client";

import { useEffect } from "react";

const ICONS = "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css";

/**
 * Odložené vedlejší úkoly. Obojí by jinak zdržovalo první snímek:
 * styl ikon blokuje vykreslení, registrace workera bere hlavní vlákno.
 */
export default function ClientBoot() {
  useEffect(() => {
    // Ikony jsou dekorace textu, ne obsah — smí dorazit až po vykreslení.
    if (!document.getElementById("ti-font")) {
      const link = document.createElement("link");
      link.id = "ti-font";
      link.rel = "stylesheet";
      link.href = ICONS;
      document.head.appendChild(link);
    }

    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const t = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[pwa] registrace selhala:", err);
      });
    }, 1500);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
