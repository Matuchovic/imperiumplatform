"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { druhSouboru, BARVA, IKONA } from "@/lib/betmail/prilohy";
import { velikost, MAX_SOUBOR } from "@/lib/cloud/soubory";

/**
 * Přílohy k nové zprávě.
 *
 * Dvě cesty: nahrát nový soubor, nebo vybrat ten, co už v cloudu je.
 * Nahraný jde rovnou do cloudu — jinak by tytéž smlouvy ležely
 * na dvou místech a nikdo by nevěděl, která je platná.
 */

type Soubor = { id: number; nazev: string; velikost: number; je_slozka: boolean };

export default function PrilohyVyber({
  vybrane,
  onZmena,
}: {
  vybrane: number[];
  onZmena: (ids: number[]) => void;
}) {
  const [soubory, setSoubory] = useState<Soubor[]>([]);
  const [otevreno, setOtevreno] = useState(false);
  const [hledat, setHledat] = useState("");
  const [nahravam, setNahravam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const vstup = useRef<HTMLInputElement>(null);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch("/api/cloud", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (r.ok) setSoubory((d.polozky ?? []).filter((p: Soubor) => !p.je_slozka));
    } catch { /* cloud nemusí být nastavený */ }
  }, []);

  useEffect(() => { nacti(); }, [nacti]);

  async function nahraj(list: FileList) {
    setNahravam(true);
    setChyba(null);
    const nove: number[] = [];

    for (const f of Array.from(list)) {
      if (f.size > MAX_SOUBOR) {
        setChyba(`„${f.name}" je větší než ${Math.round(MAX_SOUBOR / 1024 / 1024)} MB.`);
        continue;
      }
      const fd = new FormData();
      fd.append("soubor", f);
      try {
        const r = await fetch("/api/cloud", { method: "POST", body: fd });
        const d = await r.json().catch(() => null);
        if (r.ok && d?.polozka?.id) nove.push(d.polozka.id);
        else setChyba(d?.error ?? `Nahrání „${f.name}" selhalo.`);
      } catch {
        setChyba(`Nahrání „${f.name}" selhalo.`);
      }
    }

    setNahravam(false);
    if (nove.length) onZmena([...vybrane, ...nove]);
    nacti();
  }

  const filtr = hledat.trim().toLowerCase();
  const videt = filtr ? soubory.filter((s) => s.nazev.toLowerCase().includes(filtr)) : soubory;
  const pripojene = soubory.filter((s) => vybrane.includes(s.id));

  return (
    <div className="set-pole">
      <span className="set-label">Přílohy</span>

      {pripojene.length > 0 && (
        <div className="pz-pripojene">
          {pripojene.map((s) => {
            const d = druhSouboru(s.nazev);
            return (
              <span key={s.id} className="pz-chip">
                <i className={`ti ti-${IKONA[d]}`} style={{ color: BARVA[d] }} aria-hidden="true" />
                <span className="pz-chip__nazev">{s.nazev}</span>
                <span className="data pz-chip__v">{velikost(s.velikost)}</span>
                <button
                  onClick={() => onZmena(vybrane.filter((x) => x !== s.id))}
                  aria-label={`Odebrat ${s.nazev}`}
                >
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {chyba && <p className="pz-chyba">{chyba}</p>}

      <div className="pz-tlacitka">
        <button className="adm-btn" onClick={() => vstup.current?.click()} disabled={nahravam}>
          <i className="ti ti-upload" aria-hidden="true" />
          {nahravam ? "Nahrávám…" : "Nahrát soubor"}
        </button>
        <input ref={vstup} type="file" multiple hidden
               onChange={(e) => e.target.files && nahraj(e.target.files)} />
        <button className="adm-btn" onClick={() => setOtevreno((o) => !o)}>
          <i className="ti ti-cloud" aria-hidden="true" />
          {otevreno ? "Skrýt cloud" : "Vybrat z cloudu"}
        </button>
      </div>

      {otevreno && (
        <div className="pz-cloud">
          <label className="tz-hledat" style={{ minWidth: 0 }}>
            <i className="ti ti-search" aria-hidden="true" />
            <input value={hledat} onChange={(e) => setHledat(e.target.value)}
                   placeholder="Hledat v cloudu…" aria-label="Hledat v cloudu" />
          </label>

          <div className="pz-seznam">
            {videt.length === 0 ? (
              <p className="kal__prazdno" style={{ padding: "10px 4px" }}>
                {soubory.length === 0 ? "Cloud je prázdný." : "Nic nenalezeno."}
              </p>
            ) : (
              videt.slice(0, 40).map((s) => {
                const d = druhSouboru(s.nazev);
                const uz = vybrane.includes(s.id);
                return (
                  <button
                    key={s.id}
                    className={`pz-polozka ${uz ? "pz-polozka--on" : ""}`}
                    onClick={() => onZmena(uz ? vybrane.filter((x) => x !== s.id) : [...vybrane, s.id])}
                  >
                    <i className={`ti ti-${IKONA[d]}`} style={{ color: BARVA[d] }} aria-hidden="true" />
                    <span className="pz-polozka__nazev">{s.nazev}</span>
                    <span className="data pz-polozka__v">{velikost(s.velikost)}</span>
                    {uz && <i className="ti ti-check" style={{ color: "#7ef0a8" }} aria-hidden="true" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
