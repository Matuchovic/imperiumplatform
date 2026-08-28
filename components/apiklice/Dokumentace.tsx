"use client";

import { useState } from "react";
import { NIKDY } from "@/lib/apiklice/klice";

/**
 * Dokumentace pro toho, kdo dělá web.
 *
 * Ukázky jsou k okopírování, ne k opsání — každá má tlačítko.
 * Adresa se bere z prohlížeče, aby seděla i na náhledovém nasazení.
 */

type Bod = {
  metoda: string;
  cesta: string;
  opravneni: string;
  nazev: string;
  popis: string;
  telo?: string;
  odpoved: string;
};

const BODY: Bod[] = [
  {
    metoda: "POST", cesta: "/api/v1/kontakt", opravneni: "kontakty:zapis",
    nazev: "Založit kontakt",
    popis: "Formulář na webu vytvoří kontakt v databázi. Souhlas se ukládá se zdrojem a časem.",
    telo: `{
  "jmeno": "Jan Novák",
  "email": "jan@example.cz",
  "telefon": "+420 777 123 456",
  "souhlas": true,
  "poznamka": "Zájem o měsíční tarif"
}`,
    odpoved: `201 Created
{ "ok": true }`,
  },
  {
    metoda: "POST", cesta: "/api/v1/dotaz", opravneni: "podpora:zapis",
    nazev: "Založit dotaz",
    popis: "Kontaktní formulář vytvoří dotaz v sekci Support.",
    telo: `{
  "email": "jan@example.cz",
  "predmet": "Dotaz na ceník",
  "text": "Dobrý den, zajímá mě…"
}`,
    odpoved: `201 Created
{ "ok": true }`,
  },
  {
    metoda: "GET", cesta: "/api/v1/statistiky", opravneni: "statistiky:cteni",
    nazev: "Veřejná čísla",
    popis: "Zaokrouhlená čísla pro web. Při malém vzorku se výkonnost neposílá vůbec.",
    odpoved: `200 OK
{
  "klientu": 42,
  "tiketu": 1830,
  "roi": 2.9,
  "clv": 1.84,
  "poznamka": null
}`,
  },
];

const CHYBY: [string, string, string][] = [
  ["401", "Chybí nebo neplatný klíč", "Hlavička Authorization chybí, má špatný tvar, klíč vypršel nebo byl odvolán."],
  ["403", "Z téhle domény klíč neplatí", "Klíč je omezený doménou a požadavek přišel odjinud."],
  ["403", "Klíč nemá oprávnění", "Klíč existuje, ale nemá právo na tenhle koncový bod."],
  ["422", "Neúplná data", "Chybí e-mail, je neplatný, nebo je text příliš krátký."],
  ["429", "Vyčerpaný hodinový limit", "Počkej do další hodiny nebo si nech limit zvýšit."],
];

export default function Dokumentace() {
  const [zkopirovano, setZkopirovano] = useState<string | null>(null);

  const zaklad = typeof window !== "undefined" ? window.location.origin : "";

  function kopiruj(text: string, klic: string) {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setZkopirovano(klic);
    setTimeout(() => setZkopirovano(null), 1600);
  }

  const Kod = ({ text, id }: { text: string; id: string }) => (
    <div className="dk-kod">
      <pre>{text}</pre>
      <button className="dk-kopie" onClick={() => kopiruj(text, id)}>
        <i className={`ti ti-${zkopirovano === id ? "check" : "copy"}`} aria-hidden="true" />
        {zkopirovano === id ? "Zkopírováno" : "Kopírovat"}
      </button>
    </div>
  );

  return (
    <>
      <div className="adm-panel">
        <p className="adm-panel__title">Jak se přihlásit</p>
        <p className="adm-panel__lead">
          Klíč patří do hlavičky každého požadavku. Nikdy ne do adresy —
          adresy se zapisují do protokolů serverů a proxy po cestě.
        </p>
        <Kod id="auth" text={`Authorization: Bearer bi_live_…
Content-Type: application/json`} />

        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Volej ze serveru, ne z prohlížeče.</span>{" "}
            <span className="adm-alert__detail">
              Klíč v kódu stránky si přečte kdokoli. Na Next.js patří do
              proměnné prostředí bez předpony NEXT_PUBLIC.
            </span>
          </span>
        </div>
      </div>

      {BODY.map((b) => (
        <div key={b.cesta} className="adm-panel">
          <p className="dk-cesta">
            <span className={`dk-metoda dk-metoda--${b.metoda.toLowerCase()}`}>{b.metoda}</span>
            <span className="data">{b.cesta}</span>
            <span className="dk-opr">{b.opravneni}</span>
          </p>
          <p className="adm-panel__title" style={{ marginTop: 10 }}>{b.nazev}</p>
          <p className="adm-panel__lead">{b.popis}</p>

          {b.telo && (
            <>
              <p className="data dk-nadpis">TĚLO POŽADAVKU</p>
              <Kod id={`${b.cesta}-telo`} text={b.telo} />
            </>
          )}

          <p className="data dk-nadpis">ODPOVĚĎ</p>
          <Kod id={`${b.cesta}-odp`} text={b.odpoved} />

          <p className="data dk-nadpis">UKÁZKA</p>
          <Kod
            id={`${b.cesta}-fetch`}
            text={`const r = await fetch("${zaklad}${b.cesta}", {
  method: "${b.metoda}",
  headers: {
    Authorization: \`Bearer \${process.env.BETIMPERIUM_API_KLIC}\`,
    "Content-Type": "application/json",
  },${b.telo ? `\n  body: JSON.stringify(${b.telo.replace(/\n/g, "\n  ")}),` : ""}
});

if (!r.ok) {
  const { chyba } = await r.json();
  throw new Error(chyba);
}`}
          />
        </div>
      ))}

      <div className="adm-panel">
        <p className="adm-panel__title">Chyby</p>
        <p className="adm-panel__lead">
          Každá chyba vrací JSON s polem <span className="data">chyba</span> a českým popisem.
        </p>
        <div className="dk-chyby">
          {CHYBY.map(([kod, nazev, popis], i) => (
            <div key={i} className="dk-chyba">
              <span className="data dk-kod-cislo">{kod}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="dk-chyba__n">{nazev}</span>
                <span className="dk-chyba__p">{popis}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="adm-panel">
        <p className="adm-panel__title">Co klíč nikdy neumožní</p>
        <p className="adm-panel__lead">
          Nejsou to vypnutá oprávnění — pro tyhle věci v API vůbec neexistuje
          koncový bod.
        </p>
        {NIKDY.map((n, i) => (
          <div key={i} className="kl-nesmi">
            <i className="ti ti-x" aria-hidden="true" />
            <span>{n}</span>
          </div>
        ))}
      </div>
    </>
  );
}
