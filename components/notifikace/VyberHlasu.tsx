"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Výběr hlasu.
 *
 * Ukázku přehraje ElevenLabs přímo — je to jejich soubor, ne náš,
 * takže nás poslech nestojí nic a jde vyzkoušet kolik chceš.
 */

type Hlas = { id: string; nazev: string; popis: string; cesky: boolean; ukazka: string | null };

const MODELY: { id: string; nazev: string; popis: string }[] = [
  { id: "eleven_multilingual_v2", nazev: "Multilingual v2", popis: "Nejlepší kvalita, pomalejší" },
  { id: "eleven_turbo_v2_5", nazev: "Turbo v2.5", popis: "Rychlý, levnější" },
  { id: "eleven_flash_v2_5", nazev: "Flash v2.5", popis: "Nejrychlejší, nejlevnější" },
];

export default function VyberHlasu() {
  const [hlasy, setHlasy] = useState<Hlas[]>([]);
  const [vybrany, setVybrany] = useState<string | null>(null);
  const [model, setModel] = useState("eleven_multilingual_v2");
  const [hraje, setHraje] = useState<string | null>(null);
  const [nacitam, setNacitam] = useState(true);
  const [uklada, setUklada] = useState(false);
  const [zkouska, setZkouska] = useState(false);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch("/api/hlas?hlasy=1", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (d?.pripraven) {
        setHlasy(d.hlasy ?? []);
        setVybrany(d.vybrany ?? null);
        setModel(d.model ?? "eleven_multilingual_v2");
      }
    } catch { /* příště */ }
    setNacitam(false);
  }, []);

  useEffect(() => { nacti(); }, [nacti]);

  function poslechni(h: Hlas) {
    if (!h.ukazka) return;
    setHraje(h.id);
    const a = new Audio(h.ukazka);
    a.onended = () => setHraje(null);
    a.play().catch(() => setHraje(null));
  }

  async function uloz(id: string, nazev: string, novyModel = model) {
    setUklada(true);
    setVybrany(id);
    setModel(novyModel);
    await fetch("/api/hlas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hlas_id: id, hlas_nazev: nazev, model: novyModel }),
    }).catch(() => undefined);
    setUklada(false);
  }

  /** Zkouška českou větou. Tahle už jde přes náš server a stojí znaky. */
  async function zkusCesky() {
    setZkouska(true);
    try {
      const r = await fetch("/api/hlas/rec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Dobrý den. Faktura dva tisíce dvacet šest je po splatnosti a klient Procházka potřebuje pozornost.",
        }),
      });
      if (r.ok) {
        const url = URL.createObjectURL(await r.blob());
        const a = new Audio(url);
        a.onended = () => URL.revokeObjectURL(url);
        await a.play();
      }
    } catch { /* nevadí */ }
    setZkouska(false);
  }

  if (nacitam) return null;
  if (hlasy.length === 0) return null;

  const cesti = hlasy.filter((h) => h.cesky);
  const ostatni = hlasy.filter((h) => !h.cesky);

  return (
    <div className="adm-panel">
      <p className="adm-panel__title">Výběr hlasu</p>
      <p className="adm-panel__lead">
        Hlas ověřený pro češtinu zní lépe než anglický, který češtinu jen zvládá —
        ten mluví s přízvukem. Ukázku od ElevenLabs si můžeš pustit zdarma.
      </p>

      {cesti.length === 0 && (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Žádný hlas ověřený pro češtinu.</span>{" "}
            <span className="adm-alert__detail">
              Na elevenlabs.io ve Voice Library vyfiltruj jazyk Czech a přidej si hlas
              do My Voices — objeví se tady.
            </span>
          </span>
        </div>
      )}

      {[
        { nadpis: "OVĚŘENÉ PRO ČEŠTINU", seznam: cesti },
        { nadpis: "OSTATNÍ", seznam: ostatni },
      ].filter((s) => s.seznam.length > 0).map((skupina) => (
        <div key={skupina.nadpis}>
          <p className="data zv-ukazky__nadpis">{skupina.nadpis}</p>
          <div className="vh-mrizka">
            {skupina.seznam.map((h) => (
              <div key={h.id} className={`vh-karta ${vybrany === h.id ? "vh-karta--on" : ""}`}>
                <button
                  className="vh-hrat"
                  onClick={() => poslechni(h)}
                  disabled={!h.ukazka}
                  aria-label={`Poslechnout ${h.nazev}`}
                >
                  <i className={`ti ti-${hraje === h.id ? "player-pause" : "player-play"}`} aria-hidden="true" />
                </button>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="vh-nazev">
                    {h.nazev}
                    {h.cesky && <span className="vh-cesky">CZ</span>}
                  </span>
                  {h.popis && <span className="vh-popis">{h.popis}</span>}
                </span>

                <button
                  className={`adm-btn ${vybrany === h.id ? "adm-btn--primary" : ""}`}
                  onClick={() => uloz(h.id, h.nazev)}
                  disabled={uklada}
                >
                  {vybrany === h.id ? "Vybraný" : "Vybrat"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <label className="set-pole" style={{ marginTop: 16 }}>
        <span className="set-label">Model</span>
        <select
          className="set-input"
          value={model}
          onChange={(e) => vybrany && uloz(vybrany, "", e.target.value)}
        >
          {MODELY.map((m) => (
            <option key={m.id} value={m.id}>{m.nazev} — {m.popis}</option>
          ))}
        </select>
      </label>

      <div className="adm-actions">
        <button className="adm-btn" onClick={zkusCesky} disabled={!vybrany || zkouska}>
          <i className="ti ti-volume" aria-hidden="true" />
          {zkouska ? "Načítám…" : "Zkusit českou větu"}
        </button>
      </div>

      <p className="adm-todo__note">
        Zkouška jde přes ElevenLabs a spotřebuje sto znaků. Ukázky u jednotlivých
        hlasů jsou zdarma — hrají se přímo od nich.
      </p>
    </div>
  );
}
