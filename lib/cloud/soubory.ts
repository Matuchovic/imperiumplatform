/**
 * Pomocné funkce pro Cloud. Čisté — jdou otestovat bez databáze.
 */

/** Velikost v čitelné podobě. Desetinné místo jen tam, kde nese informaci. */
export function velikost(bajtu: number): string {
  if (bajtu < 0) return "0 B";
  if (bajtu < 1024) return `${bajtu} B`;
  const kb = bajtu / 1024;
  if (kb < 1024) return `${Math.round(kb)} kB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** Přípona bez tečky, malými písmeny. */
export const pripona = (nazev: string): string => {
  const i = nazev.lastIndexOf(".");
  return i > 0 ? nazev.slice(i + 1).toLowerCase() : "";
};

/** Ikona podle přípony — člověk pozná typ dřív, než přečte název. */
export function ikona(nazev: string, jeSlozka = false): string {
  if (jeSlozka) return "folder";
  const p = pripona(nazev);
  if (["pdf"].includes(p)) return "file-type-pdf";
  if (["doc", "docx", "odt", "rtf"].includes(p)) return "file-type-doc";
  if (["xls", "xlsx", "ods", "csv"].includes(p)) return "file-type-xls";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].includes(p)) return "photo";
  if (["zip", "rar", "7z", "tar", "gz"].includes(p)) return "file-zip";
  if (["mp4", "mov", "avi", "mkv"].includes(p)) return "video";
  if (["mp3", "wav", "m4a"].includes(p)) return "music";
  return "file";
}

/**
 * Bezpečný název pro úložiště.
 *
 * Diakritika a mezery v cestě dělají problémy s kódováním adresy,
 * takže do bucketu jde očištěná podoba. Původní název zůstává
 * v databázi a používá se při stahování.
 */
export function bezpecnyNazev(nazev: string): string {
  const bezDiakritiky = nazev
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return bezDiakritiky
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "soubor";
}

/** Cesta v bucketu. Náhodná předpona brání hádání cizích adres. */
export function cestaVUlozisti(nazev: string): string {
  const d = new Date();
  const nahoda = Math.random().toString(36).slice(2, 10);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${nahoda}-${bezpecnyNazev(nazev)}`;
}

export const DRUHY: Record<string, string> = {
  smlouva: "Smlouvy",
  faktura: "Faktury",
  vypis: "Výpisy",
  doklad: "Doklady",
  report: "Reporty",
  ostatni: "Ostatní",
};

/** Strop na hromadné operace — jedno kliknutí nesmí spustit stovky stažení. */
export const MAX_DAVKA = 50;

/** Největší soubor. Nad tím se nahrávání na Vercelu neuživí. */
export const MAX_SOUBOR = 25 * 1024 * 1024;
