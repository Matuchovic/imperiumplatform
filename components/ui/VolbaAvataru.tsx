"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import { EFEKTY, type Efekt } from "@/lib/avatar";

/**
 * Volba efektu avataru.
 *
 * Náhled je živý — člověk vidí, co si vybírá, místo aby to musel
 * odhadovat z názvu.
 */
export default function VolbaAvataru({
  jmeno,
  vychozi = "zadny",
}: {
  jmeno: string;
  vychozi?: Efekt;
}) {
  const [efekt, setEfekt] = useState<Efekt>(vychozi);
  const [ulozeno, setUlozeno] = useState(false);
  const [bezi, setBezi] = useState(false);

  async function uloz() {
    setBezi(true);
    try {
      const r = await fetch("/api/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ efekt }),
      });
      if (r.ok) {
        setUlozeno(true);
        setTimeout(() => setUlozeno(false), 2200);
      }
    } catch { /* tichý neúspěch, uživatel zkusí znovu */ }
    setBezi(false);
  }

  return (
    <div className="adm-panel">
      <p className="adm-panel__title">Avatar</p>
      <p className="adm-panel__lead">
        Barva se odvozuje ze jména, takže každý má jinou a v seznamu se dá orientovat.
        Efekt je nepovinný.
      </p>

      <div className="va-mrizka">
        {EFEKTY.map((e) => (
          <button
            key={e.klic}
            className={`va-volba ${efekt === e.klic ? "va-volba--on" : ""}`}
            onClick={() => setEfekt(e.klic)}
            aria-pressed={efekt === e.klic}
          >
            <span className="va-nahled">
              <Avatar jmeno={jmeno} velikost={40} efekt={e.klic} />
            </span>
            <span className="va-nazev">{e.nazev}</span>
            <span className="va-popis">{e.popis}</span>
          </button>
        ))}
      </div>

      <div className="adm-actions">
        <button className="adm-btn adm-btn--primary" onClick={uloz} disabled={bezi}>
          {ulozeno ? "Uloženo" : bezi ? "Ukládám…" : "Uložit"}
        </button>
      </div>
    </div>
  );
}
