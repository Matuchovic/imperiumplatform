"use client";

import { useEffect } from "react";

/** Registruje servisní worker. Bez něj PWA nejde nainstalovat. */
export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const t = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[pwa] registrace selhala:", err);
      });
    }, 1200);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
