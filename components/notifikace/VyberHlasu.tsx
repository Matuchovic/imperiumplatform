"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Výběr hlasu.
 *
 * Ukázku přehraje ElevenLabs přímo — je to jejich soubor, ne náš,
 * takže nás poslech nestojí nic a jde vyzkoušet kolik chceš.
 */

type Hlas = {
  id: string; nazev: string; popis: string;
  cesky: boolean; zakladni: boolean; ukazka: string | null;
};

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
  const [vysledek, setVysledek] = useState<string | null>(null);

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
    setVysledek(null);
    try {
      const r = await fetch("/api/hlas/rec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Dobrý den. Faktura je po splatnosti a klient Procházka potřebuje pozornost.",
        }),
      });

      if (!r.ok) {
        // Důvod od serveru, ne obecné selhání — každý má jiné řešení.
        setVysledek(await r.text().catch(() => `Chyba ${r.status}.`));
        setZkouska(false);
        return;
      }

      const zvuk = await r.blob();
      if (zvuk.size < 500) {
        setVysledek("Server vrátil prázdný zvuk.");
        setZkouska(false);
        return;
      }

      const url = URL.createObjectURL(zvuk);
      const a = new Audio(url);
      a.onended = () => URL.revokeObjectURL(url);
      a.onerror = () => setVysledek("Prohlížeč zvuk nepřehrál.");
      await a.play().catch(() => setVysledek("Prohlížeč přehrání odmítl — klepni nejdřív na stránku."));
      setVysledek(`Hraje. ${Math.round(zvuk.size / 1024)} kB z ElevenLabs.`);
    } catch (e) {
      setVysledek(e instanceof Error ? e.message : "Spojení selhalo.");
    }
    setZkouska(false);
  }

  if (nacitam) return null;
  if (hlasy.length === 0) return null;

  /**
   * Rozdělení podle toho, co na free plánu vůbec funguje.
   *
   * Hlas z knihovny může znít líp, ale přes API vrátí 402 —
   * nabízet ho jako první znamená posílat člověka do zdi.
   */
  const zakladniCz = hlasy.filter((h) => h.zakladni && h.cesky);
  const zakladniOstatni = hlasy.filter((h) => h.zakladni && !h.cesky);
  const knihovna = hlasy.filter((h) => !h.zakladni);

  return (
    <div className="adm-panel">
      <p className="adm-panel__title">Výběr hlasu</p>
      <p className="adm-panel__lead">
        Hlas ověřený pro češtinu zní lépe než anglický, který češtinu jen zvládá —
        ten mluví s přízvukem. Ukázku od ElevenLabs si můžeš pustit zdarma.
      </p>

      <div className="adm-alert">
        <span className="adm-alert__text">
          <span className="adm-alert__title">Free plán pustí přes API jen základní hlasy.</span>{" "}
          <span className="adm-alert__detail">
            Hlasy z knihovny vypadají v seznamu stejně, ale vrátí chybu 402.
            Jsou dole a označené — vybrat jdou až po přechodu na placený plán.
          </span>
        </span>
      </div>

      {[
        { nadpis: "ZÁKLADNÍ · OVĚŘENÉ PRO ČEŠTINU", seznam: zakladniCz },
        { nadpis: "ZÁKLADNÍ · OSTATNÍ", seznam: zakladniOstatni },
        { nadpis: "Z KNIHOVNY · VYŽADUJÍ PLACENÝ PLÁN", seznam: knihovna },
      ].filter((s) => s.seznam.length > 0).map((skupina) => (
        <div key={skupina.nadpis}>
          <p className="data zv-ukazky__nadpis">{skupina.nadpis}</p>
          <div className="vh-mrizka">
            {skupina.seznam.map((h) => (
              <div
                key={h.id}
                className={`vh-karta ${vybrany === h.id ? "vh-karta--on" : ""} ${!h.zakladni ? "vh-karta--placena" : ""}`}
              >
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
                    {!h.zakladni && <span className="vh-placene">PLACENÝ</span>}
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

      {vysledek && (
        <div className={`adm-alert ${vysledek.startsWith("Hraje") ? "" : "adm-alert--bad"}`}>
          <span className="adm-alert__text">
            <span className="adm-alert__title">{vysledek}</span>
          </span>
        </div>
      )}

      <p className="adm-todo__note">
        Zkouška jde přes ElevenLabs a spotřebuje sto znaků. Ukázky u jednotlivých
        hlasů jsou zdarma — hrají se přímo od nich.
      </p>
    </div>
  );
}
