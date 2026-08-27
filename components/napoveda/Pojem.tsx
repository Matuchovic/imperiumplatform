"use client";

import { useState } from "react";
import { POJMY } from "@/lib/napoveda/pojmy";

/**
 * Vysvětlení pojmu přímo v textu.
 *
 * Funguje i z klávesnice, ne jen myší — jinak by byl pojem
 * nedostupný pro toho, kdo myš nepoužívá.
 */
export default function Pojem({
  klic,
  children,
}: {
  klic: keyof typeof POJMY;
  children?: React.ReactNode;
}) {
  const [videt, setVidet] = useState(false);
  const popis = POJMY[klic];
  if (!popis) return <>{children ?? klic}</>;

  return (
    <span
      className="pojem"
      tabIndex={0}
      onMouseEnter={() => setVidet(true)}
      onMouseLeave={() => setVidet(false)}
      onFocus={() => setVidet(true)}
      onBlur={() => setVidet(false)}
      aria-describedby={videt ? `pojem-${klic}` : undefined}
    >
      {children ?? klic}
      {videt && <span className="pojem__bublina" id={`pojem-${klic}`} role="tooltip">{popis}</span>}
    </span>
  );
}
