"use client";

import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import type { Efekt } from "@/lib/avatar";

/**
 * Kdo je právě na platformě.
 *
 * Obnovuje se po půl minutě. Na odsvícené kartě se neptá —
 * seznam, který nikdo nevidí, nemá cenu dotahovat.
 */

type Clovek = { id: string; jmeno: string; efekt: string; zarizeni: string[]; posledni: string };

export default function KdoJeOnline({ jaId, kompaktni = false }: { jaId: string; kompaktni?: boolean }) {
  const [lide, setLide] = useState<Clovek[]>([]);

  const nacti = useCallback(async () => {
    if (document.hidden) return;
    try {
      const r = await fetch("/api/pritomnost", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (r.ok) setLide(d.lide ?? []);
    } catch { /* příště */ }
  }, []);

  useEffect(() => {
    nacti();
    const t = setInterval(nacti, 30_000);
    const priZmene = () => { if (!document.hidden) nacti(); };
    document.addEventListener("visibilitychange", priZmene);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", priZmene);
    };
  }, [nacti]);

  if (lide.length === 0) return null;

  /**
   * Kompaktní podoba do lišty.
   *
   * Vlastní tvář se vynechá — je hned vedle v uživatelské části
   * a dvakrát tentýž avatar vypadá jako chyba.
   */
  if (kompaktni) {
    const ostatni = lide.filter((l) => l.id !== jaId);
    if (ostatni.length === 0) return null;

    return (
      <span className="on-pas" title={`Právě na platformě: ${ostatni.map((l) => l.jmeno).join(", ")}`}>
        {ostatni.slice(0, 4).map((l) => (
          <span key={l.id} className="on-av">
            <Avatar jmeno={l.jmeno} velikost={26} efekt={l.efekt as Efekt} />
          </span>
        ))}
        {ostatni.length > 4 && <span className="on-vic">+{ostatni.length - 4}</span>}
      </span>
    );
  }

  return (
    <div className="on-panel">
      <p className="on-nadpis">
        <span className="on-tecka" aria-hidden="true" />
        Právě na platformě
        <span className="data on-pocet">{lide.length}</span>
      </p>

      <div className="on-seznam">
        {lide.map((l) => (
          <div key={l.id} className="on-radek">
            <span className="on-obal">
              <Avatar jmeno={l.jmeno} velikost={32} efekt={l.efekt as Efekt} />
              <span className="on-znak" aria-hidden="true" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="on-jmeno">
                {l.jmeno}
                {l.id === jaId && <span className="on-ja">ty</span>}
              </span>
              <span className="data on-kde">{l.zarizeni.join(" · ")}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
