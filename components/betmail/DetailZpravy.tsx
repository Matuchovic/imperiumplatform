"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import Prohlizec from "@/components/prohlizec/Prohlizec";
import { PRIORITY, REAKCE } from "@/lib/betmail/zpravy";
import { druhSouboru, BARVA, IKONA, lzePrehlednout } from "@/lib/betmail/prilohy";
import { velikost } from "@/lib/cloud/soubory";

/**
 * Detail zprávy.
 *
 * Tělo má vlastní typografii: patnáct pixelů, řádkování 1,78 a šířka
 * omezená na 64 znaků. Většina schránek sází třináctku přes celou
 * obrazovku — na širokém monitoru pak řádek utíká a oko ztrácí
 * návaznost. Tady se zpráva čte, ne skenuje.
 */

export type Zprava = {
  id: number;
  predmet: string;
  telo: string;
  odesilatel: string;
  odesilatel_jmeno: string | null;
  prijemce: string;
  priorita: string;
  odpoved_na: number | null;
  prilohy: number[];
  precteno_at: string | null;
  archivovano: boolean;
  created_at: string;
};

export type Soubor = { id: number; nazev: string; velikost: number };

export default function DetailZpravy({
  zprava,
  soubory,
  reakce,
  jaId,
  jmeno,
  vlakno,
  slozka,
  onReakce,
  onAkce,
  onOdpovedet,
  onPreposlat,
}: {
  zprava: Zprava;
  soubory: Soubor[];
  reakce: { zprava_id: number; user_id: string; znak: string }[];
  jaId: string;
  jmeno: (id: string) => string;
  vlakno: Zprava[];
  slozka: string;
  onReakce: (znak: string) => void;
  onAkce: (akce: string) => void;
  onOdpovedet: () => void;
  onPreposlat: () => void;
}) {
  const [vlaknoOtevrene, setVlaknoOtevrene] = useState(false);
  const [nahled, setNahled] = useState<Soubor | null>(null);
  const [posledni, setPosledni] = useState<string | null>(null);

  const p = PRIORITY[zprava.priorita] ?? PRIORITY.bezna;
  const prilohy = soubory.filter((s) => zprava.prilohy.includes(s.id));

  function klikReakce(znak: string) {
    const mam = reakce.some((r) => r.zprava_id === zprava.id && r.user_id === jaId && r.znak === znak);
    // Přidání vyskočí pružinou, sundání ne — potvrzovat zrušení
    // nemá smysl.
    setPosledni(mam ? null : znak);
    onReakce(znak);
  }

  return (
    <div className="bm-detail">
      {zprava.priorita === "vysoka" && (
        <span className="bm-stitek bm-stitek--zle">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          VYSOKÁ PRIORITA
        </span>
      )}

      <p className="bm-predmet">{zprava.predmet}</p>

      <div className="bm-odesilatel">
        <Avatar jmeno={zprava.odesilatel_jmeno ?? "?"} velikost={34} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="bm-od-jmeno">{zprava.odesilatel_jmeno ?? "neznámý"}</span>
          <span className="data bm-od-meta">
            pro {jmeno(zprava.prijemce)} ·{" "}
            {new Date(zprava.created_at).toLocaleString("cs-CZ", {
              day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </span>
        {zprava.precteno_at && (
          <span className="bm-stitek bm-stitek--ok">
            <span className="bm-tecka" />
            PŘEČTENO
          </span>
        )}
      </div>

      {/* Linka se vykreslí zleva doprava při otevření. */}
      <div className="bm-cara" />

      <div className="bm-telo">{zprava.telo}</div>

      {prilohy.length > 0 && (
        <div className="bm-prilohy">
          <p className="data bm-prilohy__nadpis">PŘÍLOHY · {prilohy.length}</p>
          <div className="bm-prilohy__mrizka">
            {prilohy.map((s) => {
              const d = druhSouboru(s.nazev);
              const lze = lzePrehlednout(s.nazev);
              return (
                <button
                  key={s.id}
                  className="bm-priloha"
                  onClick={() => lze && setNahled(s)}
                  disabled={!lze}
                >
                  <span className="bm-pr-ikona" style={{ background: `${BARVA[d]}1a`, color: BARVA[d] }}>
                    <i className={`ti ti-${IKONA[d]}`} aria-hidden="true" />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="bm-pr-nazev">{s.nazev}</span>
                    <span className="data bm-pr-meta">
                      {velikost(s.velikost)} · {lze ? "z cloudu" : "jen ke stažení"}
                    </span>
                  </span>
                  <i className={`ti ti-${lze ? "eye" : "download"} bm-pr-akce`} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bm-reakce">
        {REAKCE.map((z) => {
          const kolik = reakce.filter((r) => r.zprava_id === zprava.id && r.znak === z).length;
          const moje = reakce.some((r) => r.zprava_id === zprava.id && r.user_id === jaId && r.znak === z);
          return (
            <button
              key={z}
              className={`bm-reakce-btn ${moje ? "bm-reakce-btn--on" : ""} ${posledni === z ? "bm-reakce-btn--pop" : ""}`}
              onClick={() => klikReakce(z)}
              aria-pressed={moje}
            >
              <span aria-hidden="true">{z}</span>
              {kolik > 0 && <span className="data">{kolik}</span>}
            </button>
          );
        })}
      </div>

      {vlakno.length > 0 && (
        <div className="bm-vlakno">
          <button className="bm-vlakno__hlava" onClick={() => setVlaknoOtevrene((v) => !v)}>
            <i className={`ti ti-chevron-${vlaknoOtevrene ? "down" : "right"}`} aria-hidden="true" />
            {vlaknoOtevrene ? "Skrýt" : "Zobrazit"} předchozí ve vlákně ({vlakno.length})
          </button>

          {/* Rozbalená historie by odsunula to, co právě čteš, pod ohyb. */}
          {vlaknoOtevrene && vlakno.map((v) => (
            <div key={v.id} className="bm-vlakno__zprava">
              <div className="bm-vlakno__kdo">
                <Avatar jmeno={v.odesilatel_jmeno ?? "?"} velikost={24} />
                <span>{v.odesilatel_jmeno ?? "neznámý"}</span>
                <span className="data">
                  {new Date(v.created_at).toLocaleDateString("cs-CZ")}
                </span>
              </div>
              <p className="bm-vlakno__telo">{v.telo}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bm-akce">
        <button className="adm-btn adm-btn--primary" onClick={onOdpovedet}>
          <i className="ti ti-arrow-back-up" aria-hidden="true" />
          Odpovědět
        </button>
        <button className="adm-btn" onClick={onPreposlat}>
          <i className="ti ti-arrow-forward-up" aria-hidden="true" />
          Přeposlat
        </button>
        {slozka === "kos" ? (
          <button className="adm-btn" onClick={() => onAkce("vratit")}>
            <i className="ti ti-arrow-back-up" aria-hidden="true" />
            Obnovit
          </button>
        ) : (
          <>
            {slozka === "dorucene" && (
              <button className="adm-btn" onClick={() => onAkce("archivovat")}>
                <i className="ti ti-archive" aria-hidden="true" />
                Archivovat
              </button>
            )}
            <button className="adm-btn" onClick={() => onAkce("smazat")} style={{ marginLeft: "auto" }}>
              <i className="ti ti-trash" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {nahled && (
        <Prohlizec zprava={zprava.id} priloha={nahled} onZavri={() => setNahled(null)} />
      )}
    </div>
  );
}
