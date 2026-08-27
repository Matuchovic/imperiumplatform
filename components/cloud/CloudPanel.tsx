"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { velikost, ikona, DRUHY, MAX_SOUBOR } from "@/lib/cloud/soubory";

/**
 * Cloud.
 *
 * Bucket je privátní, takže se soubory nestahují přímo — server
 * vydá dočasný podepsaný odkaz platný dvě minuty.
 */

type Polozka = {
  id: number;
  nazev: string;
  je_slozka: boolean;
  rodic_id: number | null;
  velikost: number;
  typ: string | null;
  druh: string;
  vlozil_jmeno: string | null;
  created_at: string;
  smazano_at?: string | null;
};

type Obsazeni = { celkem: number; aktivni: number; kos: number; osirele: number };

const den = (iso: string) => new Date(iso).toLocaleDateString("cs-CZ");

export default function CloudPanel({ jeSpravce }: { jeSpravce: boolean }) {
  const [polozky, setPolozky] = useState<Polozka[]>([]);
  const [cesta, setCesta] = useState<{ id: number; nazev: string }[]>([]);
  const [rodic, setRodic] = useState<number | null>(null);
  const [obsazeni, setObsazeni] = useState<Obsazeni>({ celkem: 0, aktivni: 0, kos: 0, osirele: 0 });
  const [kos, setKos] = useState(false);
  const [vybrane, setVybrane] = useState<Set<number>>(new Set());
  const [nahravam, setNahravam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const vstup = useRef<HTMLInputElement>(null);

  const nacti = useCallback(async () => {
    try {
      const q = kos ? "?kos=1" : rodic ? `?rodic=${rodic}` : "";
      const r = await fetch(`/api/cloud${q}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Načtení selhalo.");
      else {
        setPolozky(d.polozky ?? []);
        setCesta(d.cesta ?? []);
        setObsazeni(d.obsazeni ?? { celkem: 0, aktivni: 0, kos: 0, osirele: 0 });
        setChyba(null);
      }
      setVybrane(new Set());
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }, [rodic, kos]);

  useEffect(() => { nacti(); }, [nacti]);

  async function nahraj(soubory: FileList) {
    setNahravam(true);
    setChyba(null);

    for (const f of Array.from(soubory)) {
      if (f.size > MAX_SOUBOR) {
        setChyba(`„${f.name}" je větší než ${Math.round(MAX_SOUBOR / 1024 / 1024)} MB.`);
        continue;
      }
      const fd = new FormData();
      fd.append("soubor", f);
      if (rodic) fd.append("rodic", String(rodic));
      try {
        const r = await fetch("/api/cloud", { method: "POST", body: fd });
        if (!r.ok) {
          const d = await r.json().catch(() => null);
          setChyba(d?.error ?? `Nahrání „${f.name}" selhalo.`);
        }
      } catch {
        setChyba(`Nahrání „${f.name}" selhalo.`);
      }
    }

    setNahravam(false);
    nacti();
  }

  async function novaSlozka() {
    const nazev = prompt("Název složky:");
    if (!nazev?.trim()) return;
    const r = await fetch("/api/cloud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nazev, rodic }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setChyba(d?.error ?? "Složku se nepodařilo založit.");
    }
    nacti();
  }

  async function stahni(ids: number[]) {
    if (ids.length === 0) return;
    const r = await fetch("/api/cloud/odkaz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) { setChyba(d?.error ?? "Odkaz se nepodařilo vytvořit."); return; }

    // Prohlížeč blokuje víc souběžných stažení, proto s odstupem.
    (d.odkazy ?? []).forEach((o: { url: string }, i: number) => {
      setTimeout(() => { window.location.href = o.url; }, i * 400);
    });
  }

  async function doKose(id: number, obnovit = false) {
    setPolozky((p) => p.filter((x) => x.id !== id));
    await fetch("/api/cloud", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, obnovit }),
    }).catch(() => undefined);
    nacti();
  }

  async function smazNatrvalo(id: number, nazev: string) {
    if (!confirm(`Trvale smazat „${nazev}"? Z úložiště to nejde vzít zpět.`)) return;
    const r = await fetch(`/api/cloud?id=${id}`, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setChyba(d?.error ?? "Smazání selhalo.");
    }
    nacti();
  }

  const prepni = (id: number) =>
    setVybrane((v) => {
      const n = new Set(v);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <>
      {chyba && (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text">
            <span className="adm-alert__title">{chyba}</span>{" "}
            <span className="adm-alert__detail">Spustil jsi supabase/cloud.sql?</span>
          </span>
        </div>
      )}

      <div className="adm-cards">
        <div className="tz-kpi">
          <p className="tz-kpi__k">POUŽITO</p>
          <p className="tz-kpi__n" style={{ fontSize: 18, color: "#dff5e8" }}>
            {velikost(obsazeni.aktivni)}
          </p>
        </div>
        <div className="tz-kpi">
          <p className="tz-kpi__k">SOUBORŮ</p>
          <p className="tz-kpi__n" style={{ color: "#7ef0a8" }}>
            {polozky.filter((p) => !p.je_slozka).length}
          </p>
        </div>
        {/* Koš zabírá místo dál — poskytovatel ho účtuje. */}
        <div className={`tz-kpi ${obsazeni.kos > 0 ? "tz-kpi--warn" : ""}`}>
          <p className="tz-kpi__k">V KOŠI</p>
          <p className="tz-kpi__n" style={{ fontSize: 18, color: obsazeni.kos > 0 ? "#ffc94a" : "#dff5e8" }}>
            {velikost(obsazeni.kos)}
          </p>
        </div>
        <div className={`tz-kpi ${obsazeni.osirele > 0 ? "tz-kpi--warn" : ""}`}>
          <p className="tz-kpi__k">BEZ ZÁZNAMU</p>
          <p className="tz-kpi__n" style={{ fontSize: 18, color: obsazeni.osirele > 0 ? "#ffc94a" : "#dff5e8" }}>
            {velikost(obsazeni.osirele)}
          </p>
        </div>
      </div>

      <div className="adm-actions">
        <button className="adm-btn adm-btn--primary" onClick={() => vstup.current?.click()} disabled={nahravam || kos}>
          <i className="ti ti-upload" aria-hidden="true" />
          {nahravam ? "Nahrávám…" : "Nahrát soubory"}
        </button>
        <input
          ref={vstup}
          type="file"
          multiple
          hidden
          onChange={(e) => e.target.files && nahraj(e.target.files)}
        />
        <button className="adm-btn" onClick={novaSlozka} disabled={kos}>
          <i className="ti ti-folder-plus" aria-hidden="true" />
          Nová složka
        </button>
        <button className={`adm-btn ${kos ? "adm-btn--primary" : ""}`} onClick={() => { setKos(!kos); setRodic(null); }}>
          <i className="ti ti-trash" aria-hidden="true" />
          {kos ? "Zpět do cloudu" : "Koš"}
        </button>
        {vybrane.size > 0 && (
          <button className="adm-btn" onClick={() => stahni([...vybrane])}>
            <i className="ti ti-download" aria-hidden="true" />
            Stáhnout ({vybrane.size})
          </button>
        )}
      </div>

      {!kos && (
        <div className="cd-cesta">
          <button className="cd-krok" onClick={() => setRodic(null)}>
            <i className="ti ti-home" aria-hidden="true" />
            Cloud
          </button>
          {cesta.map((c) => (
            <span key={c.id} style={{ display: "contents" }}>
              <i className="ti ti-chevron-right cd-sipka" aria-hidden="true" />
              <button className="cd-krok" onClick={() => setRodic(c.id)}>{c.nazev}</button>
            </span>
          ))}
        </div>
      )}

      <div className="tz-skupina">
        {polozky.length === 0 ? (
          <p className="adm-panel__lead" style={{ margin: 0 }}>
            {kos ? "Koš je prázdný." : "Tady zatím nic není. Nahraj první soubor nebo založ složku."}
          </p>
        ) : (
          polozky.map((p) => (
            <div key={p.id} className="cd-radek">
              {!p.je_slozka && !kos && (
                <button
                  className={`uk-box ${vybrane.has(p.id) ? "uk-box--on" : ""}`}
                  onClick={() => prepni(p.id)}
                  aria-label={vybrane.has(p.id) ? "Odznačit" : "Označit"}
                >
                  {vybrane.has(p.id) && <i className="ti ti-check" aria-hidden="true" />}
                </button>
              )}

              <span className="cd-ikona">
                <i className={`ti ti-${ikona(p.nazev, p.je_slozka)}`} aria-hidden="true" />
              </span>

              <button
                className="cd-jmeno"
                onClick={() => p.je_slozka && !kos ? setRodic(p.id) : stahni([p.id])}
                disabled={kos && p.je_slozka}
              >
                <span className="cd-nazev">{p.nazev}</span>
                <span className="cd-meta">
                  {!p.je_slozka && <span>{velikost(p.velikost)}</span>}
                  {!p.je_slozka && <span>{DRUHY[p.druh] ?? "Ostatní"}</span>}
                  {p.vlozil_jmeno && <span>{p.vlozil_jmeno}</span>}
                  <span>{den(p.smazano_at ?? p.created_at)}</span>
                </span>
              </button>

              <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {kos ? (
                  <>
                    <button className="tz-btn" onClick={() => doKose(p.id, true)} aria-label="Obnovit">
                      <i className="ti ti-arrow-back-up" aria-hidden="true" />
                    </button>
                    {jeSpravce && (
                      <button className="tz-btn tz-btn--zla" onClick={() => smazNatrvalo(p.id, p.nazev)} aria-label="Smazat trvale">
                        <i className="ti ti-trash-x" aria-hidden="true" />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {!p.je_slozka && (
                      <button className="tz-btn" onClick={() => stahni([p.id])} aria-label="Stáhnout">
                        <i className="ti ti-download" aria-hidden="true" />
                      </button>
                    )}
                    <button className="tz-btn tz-btn--zla" onClick={() => doKose(p.id)} aria-label="Do koše">
                      <i className="ti ti-trash" aria-hidden="true" />
                    </button>
                  </>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      <p className="data" style={{
        margin: "14px 0 0", fontSize: 10, letterSpacing: "0.1em", lineHeight: 1.7, color: "#4c6d5b",
      }}>
        ÚLOŽIŠTĚ JE PRIVÁTNÍ · ODKAZY PLATÍ 2 MINUTY · KOŠ ZABÍRÁ MÍSTO DÁL
      </p>
    </>
  );
}
