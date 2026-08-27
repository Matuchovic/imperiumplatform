"use client";

import { useState } from "react";

/**
 * Rozbalovací vysvětlení.
 *
 * Zavřené zabere jeden řádek, takže může viset trvale a nikomu
 * nevadí. Pro odpovědi, které se nedají říct jednou větou.
 */
export default function Rozbal({
  otazka,
  children,
}: {
  otazka: string;
  children: React.ReactNode;
}) {
  const [otevreno, setOtevreno] = useState(false);

  return (
    <div className="rozbal">
      <button
        className="rozbal__hlava"
        onClick={() => setOtevreno((o) => !o)}
        aria-expanded={otevreno}
      >
        <span className="info__znak">
          <i className="ti ti-help" aria-hidden="true" />
        </span>
        <span style={{ flex: 1 }}>{otazka}</span>
        <i className={`ti ti-chevron-${otevreno ? "down" : "right"}`} aria-hidden="true" />
      </button>
      {otevreno && <div className="rozbal__obsah">{children}</div>}
    </div>
  );
}
