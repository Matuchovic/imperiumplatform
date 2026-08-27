"use client";

import { useEffect } from "react";
import { odemkniZvuk } from "@/lib/zvuk/prehravac";

/**
 * Probuzení zvuku při prvním dotyku.
 *
 * Prohlížeče nedovolí přehrávat, dokud uživatel se stránkou
 * nekomunikuje. Bez tohohle by první upozornění bylo tiché
 * a člověk by si myslel, že zvuk nefunguje.
 */
export default function OdemkniZvuk() {
  useEffect(() => {
    const jednou = () => {
      odemkniZvuk();
      window.removeEventListener("pointerdown", jednou);
      window.removeEventListener("keydown", jednou);
    };

    window.addEventListener("pointerdown", jednou, { once: true });
    window.addEventListener("keydown", jednou, { once: true });

    return () => {
      window.removeEventListener("pointerdown", jednou);
      window.removeEventListener("keydown", jednou);
    };
  }, []);

  return null;
}
