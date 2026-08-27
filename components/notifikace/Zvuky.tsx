"use client";

import { useEffect, useState } from "react";
import { MELODIE, type Druh } from "@/lib/zvuk/tony";
import {
  zahraj, zvukZapnut, vibraceZapnuta, nastavZvuk, nastavVibraci,
  umiVibrovat, odemkniZvuk, hlasZapnut, nastavHlas, rekni, predpripravHlas,
} from "@/lib/zvuk/prehravac";

/**
 * Zvuk a vibrace.
 *
 * Nastavení je na zařízení, ne na účtu — v kanceláři chce člověk
 * zvuk, v tichém vlaku ne, a je to totéž přihlášení.
 */

const UKAZKY: { druh: Druh; nazev: string; kdy: string }[] = [
  { druh: "upozorneni", nazev: "Upozornění", kdy: "Nová věc ve zvonečku" },
  { druh: "zprava", nazev: "Zpráva", kdy: "Chat a Betmail" },
  { druh: "hotovo", nazev: "Hotovo", kdy: "Dokončená akce" },
  { druh: "chyba", nazev: "Chyba", kdy: "Něco se nepovedlo" },
];

export default function Zvuky() {
  const [zvuk, setZvuk] = useState(true);
  const [vibrace, setVibrace] = useState(true);
  const [vibruje, setVibruje] = useState(false);
  const [hraje, setHraje] = useState<Druh | null>(null);
  const [hlas, setHlas] = useState(false);
  /** null = ještě nevíme, zda je hlas nastavený na serveru. */
  const [hlasDostupny, setHlasDostupny] = useState<boolean | null>(null);

  // Až po připojení — na serveru uložené volby nejsou.
  useEffect(() => {
    setZvuk(zvukZapnut());
    setVibrace(vibraceZapnuta());
    setVibruje(umiVibrovat());
    setHlas(hlasZapnut());

    // Zjistí, jestli má server klíč. Bez něj nemá smysl nabízet.
    fetch("/api/hlas?hlasy=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setHlasDostupny(Boolean(d?.pripraven)))
      .catch(() => setHlasDostupny(false));
  }, []);

  function prepniZvuk(zap: boolean) {
    setZvuk(zap);
    nastavZvuk(zap);
    // Zapnutí se rovnou ozve, ať je jasné, jak to zní.
    if (zap) { odemkniZvuk(); zahraj("hotovo", true); }
  }

  function ukazka(d: Druh) {
    odemkniZvuk();
    setHraje(d);
    zahraj(d, true);
    setTimeout(() => setHraje(null), 600);
  }

  return (
    <div className="adm-panel">
      <p className="adm-panel__title">Zvuk a vibrace</p>
      <p className="adm-panel__lead">
        Platí jen pro tohle zařízení. V kanceláři se zvuk hodí, ve vlaku ne —
        a je to totéž přihlášení.
      </p>

      <label className="nt-radek">
        <span className="nt-ikona"><i className="ti ti-volume" aria-hidden="true" /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="nt-nazev">Zvuk upozornění</span>
          <span className="nt-popis">Krátký tón, když přibude něco ve zvonečku nebo dorazí zpráva.</span>
        </span>
        <input type="checkbox" className="nt-prep" checked={zvuk}
               onChange={(e) => prepniZvuk(e.target.checked)} />
      </label>

      <label className="nt-radek">
        <span className="nt-ikona"><i className="ti ti-device-mobile-vibration" aria-hidden="true" /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="nt-nazev">Vibrace</span>
          <span className="nt-popis">
            {vibruje
              ? "Krátké zavibrování spolu se zvukem."
              : "Tohle zařízení vibrace z prohlížeče neumí. Na iPhonu zavibruje jen systémová notifikace."}
          </span>
        </span>
        <input type="checkbox" className="nt-prep" checked={vibrace && vibruje}
               disabled={!vibruje}
               onChange={(e) => { setVibrace(e.target.checked); nastavVibraci(e.target.checked); }} />
      </label>

      {hlasDostupny && (
        <label className="nt-radek">
          <span className="nt-ikona"><i className="ti ti-microphone" aria-hidden="true" /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="nt-nazev">Mluvený hlas</span>
            <span className="nt-popis">
              Zapnuto. Místo tónu se ozve věta — „Přišel ti Betmail",
              „Faktura je po splatnosti". Vypnout jde tady.
            </span>
          </span>
          <input type="checkbox" className="nt-prep" checked={hlas}
                 onChange={(e) => {
                   setHlas(e.target.checked);
                   nastavHlas(e.target.checked);
                   if (e.target.checked) {
                     odemkniZvuk();
                     predpripravHlas();
                     void rekni("vitej");
                   }
                 }} />
        </label>
      )}

      {hlasDostupny === false && (
        <p className="adm-todo__note">
          Mluvený hlas není nastavený. Doplň do prostředí <span className="data">ELEVENLABS_API_KEY</span>{" "}
          a <span className="data">ELEVENLABS_HLAS</span>, pak pusť <span className="data">supabase/hlas.sql</span>.
        </p>
      )}

      <p className="data zv-ukazky__nadpis">JAK TO ZNÍ</p>
      <div className="zv-ukazky">
        {UKAZKY.map((u) => (
          <button
            key={u.druh}
            className={`zv-ukazka ${hraje === u.druh ? "zv-ukazka--hraje" : ""}`}
            onClick={() => ukazka(u.druh)}
          >
            <span className="zv-vlny" aria-hidden="true">
              {MELODIE[u.druh].map((t, i) => (
                <span key={i} style={{ height: `${Math.min(18, t.hz / 70)}px` }} />
              ))}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="nt-nazev">{u.nazev}</span>
              <span className="nt-popis">{u.kdy}</span>
            </span>
            <i className="ti ti-player-play" aria-hidden="true" />
          </button>
        ))}
      </div>

      <p className="adm-todo__note">
        Prohlížeč nedovolí přehrát zvuk dřív, než na stránku klepneš. První
        upozornění po otevření aplikace proto může být tiché.
      </p>
    </div>
  );
}
