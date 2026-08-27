"use client";

import { useEffect, useState } from "react";

/**
 * Návod na přidání aplikace na plochu.
 *
 * Slovo PWA se tu záměrně neobjeví — nikdo z týmu neví, co to je,
 * a vysvětlovat zkratku dřív, než řeknu užitek, je krok navíc.
 *
 * Systém se pozná sám a příslušná záložka se otevře jako první.
 * Návod pro cizí zařízení je krok, který nikdo dělat nechce.
 */

type Klic = "ios" | "android" | "pc";

type Navod = {
  nadpis: string;
  cas: string;
  ikona: string;
  pozn: string;
  kroky: string[];
  lista: string[];
  cil: number;
  polozky: { i: string; t: string }[];
  cilPolozka: number;
};

const NAVODY: Record<Klic, Navod> = {
  ios: {
    nadpis: "iPhone a iPad",
    cas: "20 VTEŘIN",
    ikona: "brand-apple",
    pozn: "Funguje jen v Safari. V Chromu na iPhonu se volba Přidat na plochu nenabízí.",
    kroky: [
      "Otevřete BETIMPERIUM v |Safari|.",
      "Klepněte na |Sdílet| {share} dole uprostřed.",
      "Sjeďte níž a vyberte |Přidat na plochu|.",
      "Potvrďte |Přidat|. Ikona se objeví mezi aplikacemi.",
    ],
    lista: ["chevron-left", "chevron-right", "share", "book", "copy"],
    cil: 2,
    polozky: [
      { i: "copy", t: "Kopírovat" },
      { i: "bookmark", t: "Přidat záložku" },
      { i: "square-plus", t: "Přidat na plochu" },
      { i: "printer", t: "Tisk" },
    ],
    cilPolozka: 2,
  },
  android: {
    nadpis: "Android",
    cas: "15 VTEŘIN",
    ikona: "brand-android",
    pozn: "V Chromu se často nabídne pruh „Přidat na plochu“ sám. Pak stačí klepnout na něj.",
    kroky: [
      "Otevřete BETIMPERIUM v |Chromu|.",
      "Klepněte na |tři tečky| {dots-vertical} vpravo nahoře.",
      "Vyberte |Přidat na plochu| nebo |Nainstalovat aplikaci|.",
      "Potvrďte |Instalovat|.",
    ],
    lista: ["chevron-left", "home", "dots-vertical"],
    cil: 2,
    polozky: [
      { i: "star", t: "Přidat mezi oblíbené" },
      { i: "device-mobile-plus", t: "Přidat na plochu" },
      { i: "share", t: "Sdílet" },
      { i: "settings", t: "Nastavení" },
    ],
    cilPolozka: 1,
  },
  pc: {
    nadpis: "Počítač",
    cas: "10 VTEŘIN",
    ikona: "device-desktop",
    pozn: "V Safari na Macu se volba jmenuje Přidat do Docku a najdete ji v nabídce Soubor.",
    kroky: [
      "Otevřete BETIMPERIUM v |Chromu| nebo |Edgi|.",
      "V adresním řádku vpravo klepněte na |ikonu instalace| {device-desktop-plus}.",
      "Potvrďte |Instalovat|.",
      "Aplikace se otevře ve vlastním okně a přidá se mezi programy.",
    ],
    lista: ["arrow-left", "refresh", "device-desktop-plus", "star", "dots-vertical"],
    cil: 2,
    polozky: [
      { i: "device-desktop-plus", t: "Instalovat BETIMPERIUM" },
      { i: "x", t: "Zrušit" },
    ],
    cilPolozka: 0,
  },
};

const VYHODY = [
  { i: "bolt", t: "Rychlejší start.", p: "Přihlášení si pamatuje, otevře se rovnou na přehledu." },
  { i: "bell", t: "Oznámení.", p: "Nový kandidát nebo dotaz klienta dorazí, i když aplikaci nemáte otevřenou." },
  { i: "wifi-off", t: "Funguje i bez signálu.", p: "Naposledy načtené obrazovky zůstanou dostupné." },
  { i: "maximize", t: "Víc místa.", p: "Bez adresního řádku a lišty prohlížeče." },
];

/**
 * Text kroku má vlastní značky: |tučně| a {ikona}. Bez toho by
 * se musel vkládat HTML řetězec — a to je zbytečné riziko.
 */
function Krok({ text }: { text: string }) {
  const casti = text.split(/(\|[^|]+\||\{[^}]+\})/g).filter(Boolean);
  return (
    <>
      {casti.map((c, i) => {
        if (c.startsWith("|")) return <b key={i}>{c.slice(1, -1)}</b>;
        if (c.startsWith("{")) return <i key={i} className={`ti ti-${c.slice(1, -1)}`} aria-hidden="true" />;
        return <span key={i}>{c}</span>;
      })}
    </>
  );
}

export default function NavodInstalace() {
  const [klic, setKlic] = useState<Klic>("ios");
  const [uzNainstalovano, setUz] = useState(false);

  useEffect(() => {
    // Systém se pozná sám. Návod pro cizí zařízení nikdo hledat nechce.
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) setKlic("ios");
    else if (/Android/.test(ua)) setKlic("android");
    else setKlic("pc");

    // Když aplikace už běží z plochy, návod je zbytečný.
    setUz(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  const n = NAVODY[klic];

  if (uzNainstalovano) {
    return (
      <div className="ap-hotovo">
        <span className="ap-hotovo__znak">
          <i className="ti ti-circle-check" aria-hidden="true" />
        </span>
        <p className="ap-hotovo__nadpis">Aplikaci už máte na ploše</p>
        <p className="ap-hotovo__popis">
          Právě ji používáte. Kdybyste ji chtěl přidat i na další zařízení,
          otevřete tuhle stránku tam.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="ap-uvodni">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-512.png" alt="Ikona BETIMPERIUM" className="ap-ikona-velka" />
        <span>
          <span className="ap-ikona-nadpis">Takhle bude vypadat na ploše</span>
          <span className="ap-ikona-popis">
            Mezi ostatními aplikacemi, se jménem BETIMPERIUM.
          </span>
        </span>
      </div>

      <div className="ap-vyhody">
        {VYHODY.map((v) => (
          <span key={v.i} className="ap-vyhoda">
            <i className={`ti ti-${v.i}`} aria-hidden="true" />
            <span>
              <b>{v.t}</b> {v.p}
            </span>
          </span>
        ))}
      </div>

      <p className="ap-uvod">
        Nic se nestahuje z obchodu a nic se neinstaluje. Ikona na ploše je zkratka
        do stejné aplikace.
      </p>

      <div className="ap-taby" role="tablist" aria-label="Systém">
        {(Object.keys(NAVODY) as Klic[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={k === klic}
            className={`ap-tab ${k === klic ? "ap-tab--on" : ""}`}
            onClick={() => setKlic(k)}
          >
            <i className={`ti ti-${NAVODY[k].ikona}`} aria-hidden="true" />
            {NAVODY[k].nadpis}
          </button>
        ))}
      </div>

      <div className="ap-karta">
        <div>
          <div className="ap-hlava">
            <span className="ap-znak">
              <i className={`ti ti-${n.ikona}`} aria-hidden="true" />
            </span>
            <span className="ap-nadpis">{n.nadpis}</span>
            <span className="data ap-cas">{n.cas}</span>
          </div>

          <div style={{ marginTop: 10 }}>
            {n.kroky.map((k, i) => (
              <div key={i} className="ap-krok">
                <span className="ap-cislo">{i + 1}</span>
                <span className="ap-text"><Krok text={k} /></span>
              </div>
            ))}
          </div>

          {/* Místa, kde by člověk zasekl a psal, že mu to nefunguje. */}
          <p className="ap-pozn">{n.pozn}</p>
        </div>

        <div className="ap-ukazka">
          <div className="ap-telefon">
            <div className="ap-obraz">
              {/* Skutečná ikona, ne text — člověk pak na ploše hledá
                  přesně to, co viděl v návodu. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192.png" alt="" className="ap-znacka" />
              <span className="ap-hotova-ikona">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192.png" alt="" className="ap-dlazdice" />
                <span className="ap-popisek">na ploše</span>
              </span>
            </div>

            <div className="ap-list">
              {n.polozky.map((p, i) => (
                <div key={i} className={`ap-radek ${i === n.cilPolozka ? "ap-radek--cil" : ""}`}>
                  <i className={`ti ti-${p.i}`} aria-hidden="true" />
                  {p.t}
                </div>
              ))}
            </div>

            <div className="ap-lista">
              {n.lista.map((i, idx) => (
                <i key={idx} className={`ti ti-${i} ${idx === n.cil ? "ap-cilova" : ""}`} aria-hidden="true" />
              ))}
            </div>
            <span
              className="ap-prst"
              style={{ left: `${18 + n.cil * (64 / n.lista.length)}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <p className="ap-pata">
        Data zůstávají na serveru, v zařízení se neukládá nic citlivého. Odebrat ikonu
        jde stejně jako kteroukoli jinou.
      </p>
    </>
  );
}
