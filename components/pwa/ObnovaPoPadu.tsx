"use client";

import { useEffect } from "react";

/**
 * Samooprava po nasazení.
 *
 * Next.js dělí kód na části s hashem v názvu. Když proběhne deploy
 * a uživatel má otevřenou starou stránku, klikne v navigaci a prohlížeč
 * sáhne po části, která už na serveru neexistuje. Výsledkem je bílá
 * obrazovka s hláškou o chybě aplikace.
 *
 * Řešení je jediné rozumné: jednou stránku obnovit. Pojistka v sezení
 * brání smyčce, kdyby byla příčina jinde než v zastaralé části.
 */

const KLIC = "bi:obnoveno-po-padu";

function jeChybaCasti(zprava: string): boolean {
  return (
    zprava.includes("ChunkLoadError") ||
    zprava.includes("Loading chunk") ||
    zprava.includes("Failed to fetch dynamically imported module") ||
    zprava.includes("Importing a module script failed") ||
    // Safari hlásí selhání sítě právě takhle.
    zprava.includes("Load failed")
  );
}

async function obnov() {
  if (sessionStorage.getItem(KLIC)) return; // druhý pokus už ne
  sessionStorage.setItem(KLIC, "1");

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => undefined)));
    }
    if ("caches" in window) {
      const klice = await caches.keys();
      await Promise.all(klice.map((k) => caches.delete(k)));
    }
  } catch {
    // I když úklid selže, obnovit se má.
  }
  window.location.reload();
}

export default function ObnovaPoPadu() {
  useEffect(() => {
    // Úspěšné načtení znamená, že je vyhráno — pojistku lze uvolnit.
    const uvolni = window.setTimeout(() => sessionStorage.removeItem(KLIC), 8_000);

    const priChybe = (e: ErrorEvent) => {
      if (jeChybaCasti(e.message ?? "")) obnov();
    };
    const priOdmitnuti = (e: PromiseRejectionEvent) => {
      const d = e.reason;
      const zprava = typeof d === "string" ? d : (d?.message ?? "");
      if (jeChybaCasti(zprava)) obnov();
    };

    window.addEventListener("error", priChybe);
    window.addEventListener("unhandledrejection", priOdmitnuti);

    return () => {
      window.clearTimeout(uvolni);
      window.removeEventListener("error", priChybe);
      window.removeEventListener("unhandledrejection", priOdmitnuti);
    };
  }, []);

  return null;
}
