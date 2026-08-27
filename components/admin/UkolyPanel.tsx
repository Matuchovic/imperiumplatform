"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Ukol = {
  id: number;
  nazev: string;
  popis: string | null;
  termin: string | null;
  hotovo: boolean;
  priorita: "nizka" | "bezna" | "vysoka";
  zdroj: string;
  created_at: string;
};

const PRIORITA: Record<Ukol["priorita"], { label: string; barva: string }> = {
  vysoka: { label: "vysoká", barva: "#ff8a8a" },
  bezna: { label: "běžná", barva: "#8fa396" },
  nizka: { label: "nízká", barva: "#5b6c61" },
};

const den = (iso: string) => new Date(iso).toLocaleDateString("cs-CZ");

export default function UkolyPanel({ ukoly, dnes }: { ukoly: Ukol[]; dnes: string }) {
  const router = useRouter();
  const [seznam, setSeznam] = useState(ukoly);
  const [busy, setBusy] = useState<number | null>(null);

  async function prepni(u: Ukol) {
    setBusy(u.id);
    // Optimisticky, ať zaškrtnutí nečeká na síť.
    setSeznam((s) => s.map((x) => (x.id === u.id ? { ...x, hotovo: !x.hotovo } : x)));

    try {
      const r = await fetch("/api/ukoly", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, hotovo: !u.hotovo }),
      });
      if (!r.ok) setSeznam((s) => s.map((x) => (x.id === u.id ? { ...x, hotovo: u.hotovo } : x)));
      else router.refresh();
    } catch {
      setSeznam((s) => s.map((x) => (x.id === u.id ? { ...x, hotovo: u.hotovo } : x)));
    }
    setBusy(null);
  }

  return (
    <div className="adm-panel">
      <div style={{ marginTop: 4 }}>
        {seznam.map((u) => {
          const poTerminu = !u.hotovo && u.termin && u.termin < dnes;
          const dnesJe = !u.hotovo && u.termin === dnes;

          return (
            <div key={u.id} className={`uk-row ${u.hotovo ? "uk-row--hotovo" : ""}`}>
              <button
                className={`uk-box ${u.hotovo ? "uk-box--on" : ""}`}
                onClick={() => prepni(u)}
                disabled={busy === u.id}
                aria-label={u.hotovo ? "Označit jako nesplněný" : "Označit jako hotový"}
              >
                {u.hotovo && <i className="ti ti-check" aria-hidden="true" />}
              </button>

              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="uk-nazev">{u.nazev}</span>
                {u.popis && <span className="uk-popis">{u.popis}</span>}
                <span className="uk-meta">
                  {u.termin && (
                    <span style={{ color: poTerminu ? "#ff8a8a" : dnesJe ? "#ffc94a" : undefined }}>
                      {poTerminu ? "po termínu · " : dnesJe ? "dnes · " : ""}
                      {den(u.termin)}
                    </span>
                  )}
                  <span style={{ color: PRIORITA[u.priorita].barva }}>{PRIORITA[u.priorita].label}</span>
                  {u.zdroj === "asistent" && <span>od asistenta</span>}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
