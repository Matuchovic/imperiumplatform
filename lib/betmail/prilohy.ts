/**
 * Rozpoznání typu přílohy. Bez závislostí — smí to vzít prohlížeč.
 */

export type Druh = "pdf" | "obrazek" | "tabulka" | "text" | "jine";

const PODLE_PRIPONY: Record<string, Druh> = {
  pdf: "pdf",
  png: "obrazek", jpg: "obrazek", jpeg: "obrazek", gif: "obrazek",
  webp: "obrazek", svg: "obrazek", avif: "obrazek",
  xlsx: "tabulka", xls: "tabulka", csv: "tabulka", tsv: "tabulka", ods: "tabulka",
  txt: "text", md: "text", json: "text", log: "text", xml: "text",
};

export const pripona = (n: string): string => {
  const i = n.lastIndexOf(".");
  return i > 0 ? n.slice(i + 1).toLowerCase() : "";
};

export const druhSouboru = (nazev: string): Druh =>
  PODLE_PRIPONY[pripona(nazev)] ?? "jine";

/** Barva podle typu — druh se pozná dřív, než se přečte název. */
export const BARVA: Record<Druh, string> = {
  pdf: "#ff8a8a",
  obrazek: "#60a5fa",
  tabulka: "#2fbd7e",
  text: "#8fa396",
  jine: "#5b6c61",
};

export const IKONA: Record<Druh, string> = {
  pdf: "file-type-pdf",
  obrazek: "photo",
  tabulka: "file-type-xls",
  text: "file-text",
  jine: "file",
};

/** Jde soubor zobrazit v prohlížeči, nebo se dá jen stáhnout? */
export const lzePrehlednout = (nazev: string): boolean =>
  druhSouboru(nazev) !== "jine";

/**
 * Rozpad CSV včetně uvozovek.
 *
 * Vlastní parser místo knihovny — pravidla jsou jednoduchá a jediná
 * záludnost je zdvojená uvozovka uvnitř pole.
 */
export function rozpadniCsv(text: string, oddelovac?: string): string[][] {
  const prvni = text.split("\n")[0] ?? "";
  // Oddělovač se pozná podle toho, kterého je v hlavičce víc.
  const o = oddelovac ?? ((prvni.match(/;/g) ?? []).length > (prvni.match(/,/g) ?? []).length ? ";" : ",");

  const radky: string[][] = [];
  let pole: string[] = [];
  let bunka = "";
  let vUvozovkach = false;

  for (let i = 0; i < text.length; i++) {
    const z = text[i];

    if (vUvozovkach) {
      if (z === '"') {
        // Zdvojená uvozovka je jedna uvozovka v obsahu.
        if (text[i + 1] === '"') { bunka += '"'; i++; }
        else vUvozovkach = false;
      } else bunka += z;
      continue;
    }

    if (z === '"') vUvozovkach = true;
    else if (z === o) { pole.push(bunka); bunka = ""; }
    else if (z === "\n") { pole.push(bunka.replace(/\r$/, "")); radky.push(pole); pole = []; bunka = ""; }
    else bunka += z;
  }

  if (bunka || pole.length) { pole.push(bunka.replace(/\r$/, "")); radky.push(pole); }
  return radky.filter((r) => r.some((b) => b.trim() !== ""));
}
