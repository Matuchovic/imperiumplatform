"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { rekni, zmlkni, hlasZapnut, prepniHlas, umiMluvit, posledniDuvodZalohy } from "@/lib/asistent/hlas";
import { poslouchejTlesk, type Poslech } from "@/lib/asistent/tlesk";
import { REZIMY, type Rezim } from "@/lib/asistent/rezimy";

/**
 * Asistent.
 *
 * Otevírá se zkratkou a zase zmizí — není to trvalý panel po straně.
 * Do systému, ve kterém člověk pracuje celý den, patří nástroj,
 * který se objeví na vyžádání, ne který zabírá místo pořád.
 */

type Odpoved = {
  text: string;
  nastroj: string | null;
  sekce: string | null;
  data: unknown;
  degradovano: boolean;
  navigace: { sekce: string; filtry?: Record<string, string> } | null;
  navrh: { akce: string; popis: string; duvod: string; endpoint: string; telo?: Record<string, unknown> } | null;
  zWebu: boolean;
  akce: { typ: "otevri_google"; dotaz: string; url: string } | { typ: "otevri_url"; url: string } | null;
  vyzkum: { dotaz: string; nalezy: Nalez[]; vznik: string } | null;
  kroky: string[];
};

type Nalez = {
  nazev: string;
  url: string;
  utrzek?: string;
  domena: string;
  vydano?: string;
  kvalita: "oficialni" | "duveryhodny" | "sekundarni" | "neznamy";
};

const KVALITA: Record<Nalez["kvalita"], { label: string; barva: string }> = {
  oficialni: { label: "oficiální", barva: "#7ef0a8" },
  duveryhodny: { label: "důvěryhodný", barva: "#60a5fa" },
  sekundarni: { label: "sekundární", barva: "#8fa396" },
  neznamy: { label: "neznámý", barva: "#6b7d73" },
};

const RYCHLE: Record<Rezim, string[]> = {
  ask: [
    "Kdo dnes potřebuje pozornost?",
    "Které pásmo má nejlepší CLV?",
    "Jak jsme na tom s klienty?",
    "Kdy naposled běžel motor?",
  ],
  search: [
    "Najdi na webu zákon o hazardních hrách",
    "Ověř v ARES firmu s IČO 27082561",
    "Otevři kontakty z Brna",
    "Najdi všechno ke jménu Novák",
  ],
  build: [
    "Založ úkol zavolat Procházkovi zítra",
    "Přidej Svobodovi poznámku že sází nad plán",
    "Ukaž otevřené úkoly",
  ],
  operate: [
    "Pozastav rozesílání",
    "Spusť hledání hodnoty",
    "Co se naposled změnilo v systému?",
  ],
};

export default function Jadro() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dotaz, setDotaz] = useState("");
  const [bezi, setBezi] = useState(false);
  const [odp, setOdp] = useState<Odpoved | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hlas, setHlas] = useState(false);
  const [zaloha, setZaloha] = useState<string | null>(null);
  const [tlesk, setTlesk] = useState(false);
  const [provadim, setProvadim] = useState(false);
  const [rezim, setRezim] = useState<Rezim>("ask");
  const [blokovano, setBlokovano] = useState<string | null>(null);
  const vyzkum = useRef<Odpoved["vyzkum"]>(null);
  const pole = useRef<HTMLInputElement>(null);
  const poslech = useRef<Poslech | null>(null);

  useEffect(() => setHlas(hlasZapnut()), []);

  useEffect(() => {
    const klavesa = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") { zmlkni(); setOpen(false); }
    };
    window.addEventListener("keydown", klavesa);
    return () => window.removeEventListener("keydown", klavesa);
  }, []);

  // Dvojí tlesknutí otevře asistenta a ohlásí se.
  useEffect(() => {
    if (!tlesk) {
      poslech.current?.stop();
      poslech.current = null;
      return;
    }
    let zruseno = false;
    poslouchejTlesk(() => {
      setOpen(true);
      rekni("Ano pane, co potřebujete?", true);
    }).then((p) => {
      if (zruseno) p?.stop();
      else poslech.current = p;
    });
    return () => { zruseno = true; poslech.current?.stop(); poslech.current = null; };
  }, [tlesk]);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
    if (open) setTimeout(() => pole.current?.focus(), 60);
    return () => document.body.classList.remove("no-scroll");
  }, [open]);

  const zeptej = useCallback(async (text: string) => {
    if (!text.trim() || bezi) return;
    setBezi(true);
    setChyba(null);
    setOdp(null);

    try {
      const res = await fetch("/api/asistent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dotaz: text, rezim, vyzkum: vyzkum.current }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) setChyba(data?.error ?? `Asistent selhal (${res.status}).`);
      else {
        const o = data as Odpoved;
        setOdp(o);
        if (o.vyzkum) vyzkum.current = o.vyzkum;

        // Prohlížeč blokuje otevření okna, když nevzniklo z akce
        // uživatele. Když se to stane, nabídne se tlačítko.
        if (o.akce) {
          const okno = window.open(o.akce.url, "_blank", "noopener,noreferrer");
          setBlokovano(okno ? null : o.akce.url);
        }

        // Přepnutí sekce nic nemění, takže se provede rovnou.
        if (o.navigace) {
          const sp = new URLSearchParams(o.navigace.filtry ?? {});
          const cil = sp.toString() ? `${o.navigace.sekce}?${sp}` : o.navigace.sekce;
          setTimeout(() => { setOpen(false); router.push(cil); }, 700);
        }
        // Mluví se jen první věta. Výhrady o velikosti vzorku
        // se lépe čtou, než poslouchají.
        if (!o.degradovano) {
          rekni(o.text);
          // Za chvíli je jasné, jestli služba odpověděla.
          setTimeout(() => setZaloha(posledniDuvodZalohy()), 1500);
        }
      }
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setBezi(false);
  }, [bezi, rezim]);

  if (!open) {
    return (
      <button className="jd-tlacitko" onClick={() => setOpen(true)} aria-label="Otevřít asistenta">
        <span className="jd-tlacitko__jadro" />
        <span className="data jd-tlacitko__zkr">⌘K</span>
      </button>
    );
  }

  return (
    <>
      <div className="jd-scrim" onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="jd-panel" role="dialog" aria-label="Asistent">
        <button className="jd-zavrit tap" onClick={() => setOpen(false)} aria-label="Zavřít">
          <i className="ti ti-x" aria-hidden="true" />
        </button>

        {/* Jádro je hlavní prvek obrazovky, ne ikonka u nadpisu.
            Ustoupí až ve chvíli, kdy je co číst. */}
        <div className={`jd-scena ${odp || chyba ? "jd-scena--male" : ""}`}>
          <span className={`jd-core ${bezi ? "jd-core--bezi" : ""}`} aria-hidden="true">
            <span className="jd-core__prsten jd-core__prsten--1" />
            <span className="jd-core__prsten jd-core__prsten--2" />
            <span className="jd-core__prsten jd-core__prsten--3" />
            <span className="jd-core__lopatky" />
            <span className="jd-core__stred" />
            <span className="jd-core__zare" />
          </span>

          <p className="data jd-stav">
            {bezi ? "ČTU Z DATABÁZE" : odp ? "HOTOVO" : "PŘIPRAVEN"}
          </p>
          {!odp && !bezi && <p className="jd-nazev">Imperium AI</p>}
        </div>

        <div className="jd-rezimy" role="tablist" aria-label="Režim asistenta">
          {REZIMY.map((r) => (
            <button
              key={r.klic}
              role="tab"
              aria-selected={rezim === r.klic}
              className={`jd-rezim ${rezim === r.klic ? "jd-rezim--on" : ""}`}
              onClick={() => { setRezim(r.klic); setOdp(null); setChyba(null); }}
              title={r.popis}
            >
              <i className={`ti ti-${r.ikona}`} aria-hidden="true" />
              {r.nazev}
            </button>
          ))}
        </div>

        <div className="jd-telo">
          {chyba && (
            <div className="adm-alert adm-alert--bad">
              <span className="adm-alert__text">
                <span className="adm-alert__title">{chyba}</span>
              </span>
            </div>
          )}

          {!odp && !bezi && !chyba && (
            <>
              <p className="jd-uvod">
                {REZIMY.find((r) => r.klic === rezim)?.popis}
              </p>
              <div className="jd-rychle">
                {RYCHLE[rezim].map((r) => (
                  <button key={r} className="jd-chip" onClick={() => { setDotaz(r); zeptej(r); }}>
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}

          {odp && (
            <>
              {odp.kroky.length > 0 && (
                <ul className="jd-kroky">
                  {odp.kroky.map((k, i) => (
                    <li key={i}><i className="ti ti-check" aria-hidden="true" />{k}</li>
                  ))}
                </ul>
              )}

              <p className={`jd-odpoved ${odp.degradovano ? "jd-odpoved--slabe" : ""}`}>{odp.text}</p>

              {blokovano && (
                <div className="jd-blok">
                  <span>Prohlížeč zablokoval otevření nové karty.</span>
                  <a className="jd-blok__btn" href={blokovano} target="_blank" rel="noopener noreferrer">
                    Otevřít
                  </a>
                </div>
              )}

              {odp.nastroj && (
                <span className={`data jd-zdroj ${odp.zWebu ? "jd-zdroj--web" : ""}`}>
                  <i className={`ti ti-${odp.zWebu ? "world" : "database"}`} aria-hidden="true" />
                  {odp.zWebu ? `${odp.nastroj} · z webu` : odp.nastroj}
                </span>
              )}

              {odp.zWebu && Array.isArray((odp.data as { nalezy?: unknown[] })?.nalezy) && (
                <div className="jd-nalezy">
                  {((odp.data as { nalezy: Nalez[] }).nalezy).map((n, i) => (
                    <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="jd-nalez">
                      <span className="jd-nalez__h">
                        <i className="ti ti-world" aria-hidden="true" />
                        {n.nazev}
                      </span>
                      {n.utrzek && <span className="jd-nalez__p">{n.utrzek}</span>}
                      <span className="jd-nalez__meta">
                        <span className="data">{n.domena}</span>
                        <span className="data" style={{ color: KVALITA[n.kvalita].barva }}>
                          {KVALITA[n.kvalita].label}
                        </span>
                        {n.vydano && <span className="data">{n.vydano}</span>}
                      </span>
                    </a>
                  ))}
                </div>
              )}

              {odp.data !== null && odp.data !== undefined && (
                <details className="jd-data">
                  <summary>Ukázat data</summary>
                  <pre>{JSON.stringify(odp.data, null, 2)}</pre>
                </details>
              )}

              {odp.navrh && (
                <div className="jd-navrh">
                  <p className="data jd-navrh__k">ČEKÁ NA SCHVÁLENÍ</p>
                  <p className="jd-navrh__co">{odp.navrh.popis}</p>
                  <p className="jd-navrh__proc">{odp.navrh.duvod}</p>
                  <div className="jd-navrh__akce">
                    <button
                      className="jd-schval"
                      disabled={provadim}
                      onClick={async () => {
                        setProvadim(true);
                        try {
                          const r = await fetch(odp.navrh!.endpoint, {
                            method: odp.navrh!.telo ? "PUT" : "POST",
                            headers: { "Content-Type": "application/json" },
                            body: odp.navrh!.telo ? JSON.stringify(odp.navrh!.telo) : undefined,
                          });
                          setChyba(r.ok ? null : `Akce selhala (${r.status}).`);
                          if (r.ok) setOdp({ ...odp, navrh: null, text: "Provedeno." });
                        } catch {
                          setChyba("Nepodařilo se spojit se serverem.");
                        }
                        setProvadim(false);
                      }}
                    >
                      {provadim ? "Provádím…" : "Schválit"}
                    </button>
                    <button className="jd-zamitni" onClick={() => setOdp({ ...odp, navrh: null })}>
                      Zamítnout
                    </button>
                  </div>
                </div>
              )}

              {odp.sekce && !odp.navigace && (
                <div className="adm-actions">
                  <button
                    className="adm-btn adm-btn--primary"
                    onClick={() => { setOpen(false); router.push(odp.sekce as string); }}
                  >
                    <i className="ti ti-arrow-right" aria-hidden="true" />
                    Otevřít sekci
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="jd-pata">
          <span className="jd-vstup">
            <i className="ti ti-sparkles" aria-hidden="true" />
            <input
              ref={pole}
              value={dotaz}
              onChange={(e) => setDotaz(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") zeptej(dotaz); }}
              placeholder="Zeptejte se na cokoli ze systému…"
              aria-label="Dotaz na asistenta"
              disabled={bezi}
            />
            <button
              className="jd-odeslat tap"
              onClick={() => zeptej(dotaz)}
              disabled={bezi || !dotaz.trim()}
              aria-label="Odeslat"
            >
              <i className={`ti ti-${bezi ? "loader-2" : "arrow-up"}`} aria-hidden="true" />
            </button>
          </span>

          <div className="jd-volby">
            {umiMluvit() && (
              <button
                className={`jd-volba ${hlas ? "jd-volba--on" : ""}`}
                onClick={() => { const n = !hlas; setHlas(n); prepniHlas(n); }}
                aria-pressed={hlas}
              >
                <i className={`ti ti-${hlas ? "volume" : "volume-off"}`} aria-hidden="true" />
                {hlas ? "Mluví" : "Mlčí"}
                {/* Když ElevenLabs selhalo, mluví prohlížeč — a je fér
                    to říct, ne nechat člověka hádat, proč zní robot. */}
                {hlas && zaloha && (
                  <span className="jd-zaloha" title={zaloha}>
                    <i className="ti ti-alert-circle" aria-hidden="true" />
                  </span>
                )}
              </button>
            )}
            <button
              className={`jd-volba ${tlesk ? "jd-volba--on" : ""}`}
              onClick={() => setTlesk((t) => !t)}
              aria-pressed={tlesk}
              title="Dvojím tlesknutím otevřeš asistenta"
            >
              <i className="ti ti-hand-click" aria-hidden="true" />
              {tlesk ? "Poslouchá tlesknutí" : "Tlesknutí vypnuté"}
            </button>
          </div>

          <p className="data jd-prava">
            <span>ČTE DATA · NAVRHUJE AKCE</span>
            <span className="jd-prava--ne">NESAHÁ NA BANKROLL · ZÚČTOVÁNÍ · ROLE · PLATBY</span>
          </p>
        </div>
      </div>
    </>
  );
}
