"use client";

import { useCallback, useEffect, useState } from "react";
import { druhSouboru, rozpadniCsv, pripona } from "@/lib/betmail/prilohy";
import { velikost } from "@/lib/cloud/soubory";

/**
 * Čtečka dokumentů.
 *
 * PDF a obrázky umí prohlížeč sám. CSV rozpadne vlastní parser.
 * Tabulky Excelu potřebují knihovnu — načte se z CDN SheetJS až
 * ve chvíli, kdy někdo tabulku otevře. Balíček z npm má známé
 * zranitelnosti a zvětšil by build i těm, kdo tabulky neotvírají.
 */

type Priloha = { id: number; nazev: string; velikost?: number };

declare global {
  interface Window { XLSX?: { read: (d: ArrayBuffer, o?: unknown) => XlsxSesit } }
}
type XlsxSesit = {
  SheetNames: string[];
  Sheets: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

const SHEETJS = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";

function nactiSheetJs(): Promise<void> {
  if (window.XLSX) return Promise.resolve();
  return new Promise((hotovo, chyba) => {
    const s = document.createElement("script");
    s.src = SHEETJS;
    s.onload = () => hotovo();
    s.onerror = () => chyba(new Error("Knihovnu pro tabulky se nepodařilo načíst."));
    document.head.appendChild(s);
  });
}

export default function Prohlizec({
  zprava,
  priloha,
  zdroj = "betmail",
  onZavri,
}: {
  /** Id zprávy. U cloudu se nepoužívá. */
  zprava?: number;
  priloha: Priloha;
  /** Odkud se soubor bere. Každý zdroj má vlastní kontrolu přístupu. */
  zdroj?: "betmail" | "cloud";
  onZavri: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [tabulka, setTabulka] = useState<string[][] | null>(null);
  const [listy, setListy] = useState<string[]>([]);
  const [list, setList] = useState(0);
  const [text, setText] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [nacitam, setNacitam] = useState(true);

  const druh = druhSouboru(priloha.nazev);

  const nacti = useCallback(async () => {
    setNacitam(true);
    setChyba(null);
    try {
      /**
       * Každý zdroj má vlastní kontrolu přístupu.
       *
       * U pošty se ověří, že soubor patří k té zprávě. U cloudu
       * platí zámek a oprávnění sekce.
       */
      const r = zdroj === "cloud"
        ? await fetch("/api/cloud/odkaz", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Náhled bez vynuceného stažení — soubor se má zobrazit.
            body: JSON.stringify({ ids: [priloha.id], nahled: true }),
          })
        : await fetch("/api/betmail/priloha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ zprava, soubor: priloha.id }),
          });

      const d = await r.json().catch(() => null);
      if (!r.ok) { setChyba(d?.error ?? "Soubor se nepodařilo načíst."); setNacitam(false); return; }

      const adresa = zdroj === "cloud" ? d.odkazy?.[0]?.url : d.url;
      if (!adresa) { setChyba("Odkaz se nepodařilo vytvořit."); setNacitam(false); return; }
      setUrl(adresa);

      if (druh === "tabulka") {
        const odpoved = await fetch(adresa);
        if (pripona(priloha.nazev) === "csv" || pripona(priloha.nazev) === "tsv") {
          setTabulka(rozpadniCsv(await odpoved.text()));
        } else {
          await nactiSheetJs();
          const sesit = window.XLSX!.read(await odpoved.arrayBuffer(), { type: "array" });
          setListy(sesit.SheetNames);
          setTabulka(sesit.utils.sheet_to_json(sesit.Sheets[sesit.SheetNames[0]], { header: 1 }));
        }
      } else if (druh === "text") {
        setText(await (await fetch(adresa)).text());
      }
    } catch (err) {
      setChyba(err instanceof Error ? err.message : "Načtení selhalo.");
    }
    setNacitam(false);
  }, [zprava, priloha.id, priloha.nazev, druh, zdroj]);

  useEffect(() => { nacti(); }, [nacti]);

  // Escape zavírá, stejně jako klepnutí vedle.
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onZavri();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onZavri]);

  async function prepniList(i: number) {
    if (!url || !window.XLSX) return;
    const sesit = window.XLSX.read(await (await fetch(url)).arrayBuffer(), { type: "array" });
    setTabulka(sesit.utils.sheet_to_json(sesit.Sheets[sesit.SheetNames[i]], { header: 1 }));
    setList(i);
  }

  return (
    <>
      <div className="pv-scrim" onClick={onZavri} />
      <div className="pv" role="dialog" aria-label={priloha.nazev}>
        <div className="pv__hlava">
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="pv__nazev">{priloha.nazev}</span>
            {priloha.velikost !== undefined && (
              <span className="data pv__meta">{velikost(priloha.velikost)}</span>
            )}
          </span>
          {url && (
            <a className="adm-btn" href={url} download={priloha.nazev}>
              <i className="ti ti-download" aria-hidden="true" />
              Stáhnout
            </a>
          )}
          <button className="tap cl-close" onClick={onZavri} aria-label="Zavřít">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {listy.length > 1 && (
          <div className="pv__listy">
            {listy.map((n, i) => (
              <button
                key={n}
                className={`pv__list ${i === list ? "pv__list--on" : ""}`}
                onClick={() => prepniList(i)}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        <div className="pv__telo">
          {nacitam ? (
            <p className="pv__stav">Načítám…</p>
          ) : chyba ? (
            <p className="pv__stav pv__stav--zle">{chyba}</p>
          ) : druh === "pdf" && url ? (
            // Prohlížeč má vlastní čtečku PDF včetně stránkování a hledání.
            <iframe src={url} title={priloha.nazev} className="pv__ram" />
          ) : druh === "obrazek" && url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={priloha.nazev} className="pv__obrazek" />
          ) : tabulka ? (
            <div className="pv__tabulka-obal">
              <table className="pv__tabulka">
                <tbody>
                  {tabulka.slice(0, 500).map((r, i) => (
                    <tr key={i} className={i === 0 ? "pv__hlavicka" : ""}>
                      <td className="pv__cislo">{i === 0 ? "" : i}</td>
                      {r.map((b, j) => <td key={j}>{String(b ?? "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {tabulka.length > 500 && (
                <p className="pv__stav">
                  Zobrazeno prvních 500 řádků z {tabulka.length}. Celý soubor si stáhni.
                </p>
              )}
            </div>
          ) : text !== null ? (
            <pre className="pv__text">{text}</pre>
          ) : (
            <p className="pv__stav">
              Tenhle typ souboru se nedá zobrazit. Stáhni si ho.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
