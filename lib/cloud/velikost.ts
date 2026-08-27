/**
 * Práce s velikostmi a názvy souborů. Čisté funkce — jdou otestovat
 * bez databáze i bez úložiště.
 */

const JEDNOTKY = ["B", "kB", "MB", "GB", "TB"];

/** Velikost čitelně. 1 536 → „1,5 kB". */
export function velikost(bajtu: number): string {
  if (!Number.isFinite(bajtu) || bajtu <= 0) return "0 B";
  const i = Math.min(JEDNOTKY.length - 1, Math.floor(Math.log(bajtu) / Math.log(1024)));
  const n = bajtu / Math.pow(1024, i);
  const zaokrouhleno = i === 0 ? Math.round(n) : Math.round(n * 10) / 10;
  return `${String(zaokrouhleno).replace(".", ",")} ${JEDNOTKY[i]}`;
}

/**
 * Bezpečná cesta v úložišti.
 *
 * Původní název se nepoužívá — diakritika, mezery a lomítka
 * v cestách dělají potíže a název si stejně držíme v databázi.
 */
export function cestaProUlozeni(nazev: string): string {
  const tecka = nazev.lastIndexOf(".");
  const pripona = tecka > 0 ? nazev.slice(tecka + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const nahodne = Math.random().toString(36).slice(2, 10);
  const razitko = Date.now().toString(36);
  return pripona ? `${razitko}-${nahodne}.${pripona}` : `${razitko}-${nahodne}`;
}

/** Přípona pro ikonu a rozlišení náhledu. */
export function pripona(nazev: string): string {
  const t = nazev.lastIndexOf(".");
  return t > 0 ? nazev.slice(t + 1).toLowerCase() : "";
}

const IKONY: Record<string, string> = {
  pdf: "file-type-pdf",
  doc: "file-type-doc", docx: "file-type-doc",
  xls: "file-type-xls", xlsx: "file-type-xls", csv: "file-type-csv",
  png: "photo", jpg: "photo", jpeg: "photo", webp: "photo", gif: "photo",
  zip: "file-zip", rar: "file-zip",
  txt: "file-text", md: "file-text",
};

export const ikonaSouboru = (nazev: string) => IKONY[pripona(nazev)] ?? "file";

/** Kolik procent kvóty je zabráno. Nikdy nad 100. */
export function zaplneno(bajtu: number, kvotaGb: number): number {
  const strop = kvotaGb * 1024 ** 3;
  if (strop <= 0) return 0;
  return Math.min(100, Math.round((bajtu / strop) * 100));
}
