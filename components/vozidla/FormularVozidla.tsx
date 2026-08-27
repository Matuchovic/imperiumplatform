"use client";

import { useState } from "react";
import { PALIVA, STAVY } from "@/lib/vozidla/lhuty";
import type { Vozidlo, Clovek } from "./VozovyPark";

/** Nové vozidlo nebo tankovací karta. Jen pro vedení. */
export default function FormularVozidla({
  co, lide, vozidla, onZavri, onUlozeno,
}: {
  co: "vozidlo" | "karta";
  lide: Clovek[];
  vozidla: Vozidlo[];
  onZavri: () => void;
  onUlozeno: () => void;
}) {
  const [f, setF] = useState<Record<string, string>>({
    spz: "", znacka: "", model: "", rok: "", palivo: "", vin: "", barva: "",
    tachometr: "0", stav: "aktivni", ridic: "", poznamka: "",
    stk_do: "", pojisteni_do: "", znamka_do: "", servis_do: "",
    cislo: "", vydavatel: "", platnost_do: "", limit_mesic: "", vozidlo_id: "", drzitel: "",
  });
  const [bezi, setBezi] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const zmen = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function uloz() {
    setBezi(true);
    setChyba(null);
    try {
      const telo: Record<string, unknown> = { co, ...f };
      // Jména se ukládají spolu s identifikátorem — po smazání účtu
      // je pak v historii pořád vidět, komu auto patřilo.
      if (f.ridic) telo.ridic_jmeno = lide.find((l) => l.id === f.ridic)?.name ?? null;
      if (f.drzitel) telo.drzitel_jmeno = lide.find((l) => l.id === f.drzitel)?.name ?? null;
      if (f.vozidlo_id) telo.vozidlo_id = Number(f.vozidlo_id);

      const r = await fetch("/api/vozidla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(telo),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Uložení selhalo.");
      else onUlozeno();
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setBezi(false);
  }

  return (
    <>
      <div className="cl-scrim" onClick={onZavri} />
      <aside className="cl-panel" role="dialog" aria-label={co === "karta" ? "Nová karta" : "Nové vozidlo"}>
        <div className="cl-panel__top">
          <span style={{ flex: 1 }}>
            <span className="cl-panel__name">{co === "karta" ? "Nová tankovací karta" : "Nové vozidlo"}</span>
            <span className="data cl-panel__id">vozový park</span>
          </span>
          <button onClick={onZavri} className="tap cl-close" aria-label="Zavřít">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {chyba && (
          <div className="adm-alert adm-alert--bad">
            <span className="adm-alert__text"><span className="adm-alert__title">{chyba}</span></span>
          </div>
        )}

        {co === "vozidlo" ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="set-pole">
                <span className="set-label">SPZ</span>
                <input className="set-input" value={f.spz} onChange={(e) => zmen("spz", e.target.value)}
                       placeholder="1AB 2345" autoFocus />
              </label>
              <label className="set-pole">
                <span className="set-label">Stav</span>
                <select className="set-input" value={f.stav} onChange={(e) => zmen("stav", e.target.value)}>
                  {Object.entries(STAVY).map(([k, v]) => (
                    <option key={k} value={k}>{v.nazev}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="set-pole">
                <span className="set-label">Značka</span>
                <input className="set-input" value={f.znacka} onChange={(e) => zmen("znacka", e.target.value)}
                       placeholder="Škoda" />
              </label>
              <label className="set-pole">
                <span className="set-label">Model</span>
                <input className="set-input" value={f.model} onChange={(e) => zmen("model", e.target.value)}
                       placeholder="Octavia" />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label className="set-pole">
                <span className="set-label">Rok</span>
                <input className="set-input" type="number" inputMode="numeric" value={f.rok}
                       onChange={(e) => zmen("rok", e.target.value)} placeholder="2022" />
              </label>
              <label className="set-pole">
                <span className="set-label">Palivo</span>
                <select className="set-input" value={f.palivo} onChange={(e) => zmen("palivo", e.target.value)}>
                  <option value="">Neuvedeno</option>
                  {Object.entries(PALIVA).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="set-pole">
                <span className="set-label">Tachometr</span>
                <input className="set-input" type="number" inputMode="numeric" value={f.tachometr}
                       onChange={(e) => zmen("tachometr", e.target.value)} />
              </label>
            </div>

            <label className="set-pole">
              <span className="set-label">Řidič</span>
              <select className="set-input" value={f.ridic} onChange={(e) => zmen("ridic", e.target.value)}>
                <option value="">Nepřiřazeno</option>
                {lide.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>

            <p className="data vz-nadpis" style={{ marginTop: 16 }}>DOKLADY A LHŮTY</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="set-pole">
                <span className="set-label">STK do</span>
                <input className="set-input" type="date" value={f.stk_do}
                       onChange={(e) => zmen("stk_do", e.target.value)} />
              </label>
              <label className="set-pole">
                <span className="set-label">Pojištění do</span>
                <input className="set-input" type="date" value={f.pojisteni_do}
                       onChange={(e) => zmen("pojisteni_do", e.target.value)} />
              </label>
              <label className="set-pole">
                <span className="set-label">Známka do</span>
                <input className="set-input" type="date" value={f.znamka_do}
                       onChange={(e) => zmen("znamka_do", e.target.value)} />
              </label>
              <label className="set-pole">
                <span className="set-label">Servis do</span>
                <input className="set-input" type="date" value={f.servis_do}
                       onChange={(e) => zmen("servis_do", e.target.value)} />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="set-pole">
                <span className="set-label">VIN</span>
                <input className="set-input" value={f.vin} onChange={(e) => zmen("vin", e.target.value)} />
              </label>
              <label className="set-pole">
                <span className="set-label">Barva</span>
                <input className="set-input" value={f.barva} onChange={(e) => zmen("barva", e.target.value)} />
              </label>
            </div>

            <label className="set-pole">
              <span className="set-label">Poznámka</span>
              <textarea className="set-input" rows={2} value={f.poznamka}
                        onChange={(e) => zmen("poznamka", e.target.value)} style={{ resize: "vertical" }} />
            </label>
          </>
        ) : (
          <>
            <label className="set-pole">
              <span className="set-label">Číslo karty</span>
              <input className="set-input" value={f.cislo} onChange={(e) => zmen("cislo", e.target.value)}
                     placeholder="7080 1234 5678" autoFocus />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="set-pole">
                <span className="set-label">Vydavatel</span>
                <input className="set-input" value={f.vydavatel}
                       onChange={(e) => zmen("vydavatel", e.target.value)} placeholder="Shell" />
              </label>
              <label className="set-pole">
                <span className="set-label">Platnost do</span>
                <input className="set-input" type="date" value={f.platnost_do}
                       onChange={(e) => zmen("platnost_do", e.target.value)} />
              </label>
            </div>
            <label className="set-pole">
              <span className="set-label">Vozidlo</span>
              <select className="set-input" value={f.vozidlo_id}
                      onChange={(e) => zmen("vozidlo_id", e.target.value)}>
                <option value="">Nepřiřazeno</option>
                {vozidla.map((v) => (
                  <option key={v.id} value={v.id}>{v.spz} — {v.znacka} {v.model ?? ""}</option>
                ))}
              </select>
            </label>
            <label className="set-pole">
              <span className="set-label">Držitel</span>
              <select className="set-input" value={f.drzitel} onChange={(e) => zmen("drzitel", e.target.value)}>
                <option value="">Nepřiřazeno</option>
                {lide.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label className="set-pole">
              <span className="set-label">Měsíční limit (Kč)</span>
              <input className="set-input" type="number" inputMode="decimal" value={f.limit_mesic}
                     onChange={(e) => zmen("limit_mesic", e.target.value)} />
            </label>
            <label className="set-pole">
              <span className="set-label">Poznámka</span>
              <input className="set-input" value={f.poznamka}
                     onChange={(e) => zmen("poznamka", e.target.value)} />
            </label>
          </>
        )}

        <div className="adm-actions">
          <button className="adm-btn adm-btn--primary" onClick={uloz} disabled={bezi}>
            {bezi ? "Ukládám…" : "Uložit"}
          </button>
          <button className="adm-btn" onClick={onZavri}>Zrušit</button>
        </div>
      </aside>
    </>
  );
}
