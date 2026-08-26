"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Přenese obsah přímo pod <body>.
 *
 * Bez toho se úvodní obrazovky vykreslovaly uvnitř přihlašovacího panelu:
 * ten má backdrop-filter a každý prvek s filtrem vytváří nový vztažný
 * rámec, takže position:fixed uvnitř něj přestane platit vůči oknu.
 */
export default function Veil({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return createPortal(children, document.body);
}
