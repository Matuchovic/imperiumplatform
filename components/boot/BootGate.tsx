"use client";

import { useEffect, useState } from "react";
import BootScreen from "./BootScreen";

const SEEN_KEY = "bi_booted";

/**
 * Přihlašovací obrazovka se vykresluje pod bootem, ne místo něj — kdyby
 * JavaScript selhal, uživatel se pořád přihlásí. Boot běží jednou za relaci;
 * opakovat ho při každé návštěvě by bylo jen zdržení.
 */
export default function BootGate({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) setBooting(false);
    } catch {
      // Privátní režim může sessionStorage zakázat — boot pak proběhne, nevadí.
    }
  }, []);

  function done() {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setBooting(false);
  }

  return (
    <>
      <div aria-hidden={booting} style={booting ? { pointerEvents: "none" } : undefined}>
        {children}
      </div>
      {booting && <BootScreen onDone={done} />}
    </>
  );
}
