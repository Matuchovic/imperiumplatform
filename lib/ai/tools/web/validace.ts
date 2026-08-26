/**
 * Ověření adresy před stažením.
 *
 * Stahování cizí adresy ze serveru je nejnebezpečnější část webového
 * výzkumu: bez kontroly by kdokoli mohl přes asistenta sáhnout na
 * vnitřní síť, na metadata cloudu nebo na soubory na disku.
 *
 * Proto se povoluje jen http a https a blokují se všechny adresy,
 * které míří dovnitř.
 */

const POVOLENE_PROTOKOLY = new Set(["http:", "https:"]);

/** Rozsahy, které nikdy nesmí ven z prohlížeče na server. */
const ZAKAZANE_ROZSAHY: RegExp[] = [
  /^127\./,                       // smyčka
  /^10\./,                        // privátní A
  /^192\.168\./,                  // privátní C
  /^172\.(1[6-9]|2\d|3[01])\./,   // privátní B
  /^169\.254\./,                  // link-local a metadata cloudu
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
];

const ZAKAZANA_JMENA = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]",
  "metadata.google.internal", "metadata",
]);

export type Verdikt = { ok: true; url: URL } | { ok: false; duvod: string };

export function overUrl(vstup: string): Verdikt {
  let url: URL;
  try {
    url = new URL(vstup.trim());
  } catch {
    return { ok: false, duvod: "Adresa nemá platný tvar." };
  }

  if (!POVOLENE_PROTOKOLY.has(url.protocol)) {
    return { ok: false, duvod: `Protokol ${url.protocol} není povolený. Jen http a https.` };
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (ZAKAZANA_JMENA.has(host)) {
    return { ok: false, duvod: "Adresa míří na tento server." };
  }
  if (host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) {
    return { ok: false, duvod: "Adresa míří do vnitřní sítě." };
  }
  if (ZAKAZANE_ROZSAHY.some((r) => r.test(host))) {
    return { ok: false, duvod: "Adresa míří do privátního rozsahu." };
  }
  // IPv6 smyčka a unique-local
  if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd") || host === "::") {
    return { ok: false, duvod: "Adresa míří do vnitřní sítě." };
  }

  return { ok: true, url };
}

/** Doména bez www — pro zobrazení a posouzení kvality zdroje. */
export function domena(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const OFICIALNI = [/\.gov\./, /\.gov$/, /justice\.cz$/, /ares\.gov\.cz$/, /uefa\.com$/, /fifa\.com$/];
const DUVERYHODNE = [/wikipedia\.org$/, /reuters\.com$/, /bbc\./, /ct24\.cz$/, /irozhlas\.cz$/, /idnes\.cz$/];

export function kvalitaZdroje(url: string): "oficialni" | "duveryhodny" | "sekundarni" | "neznamy" {
  const d = domena(url);
  if (!d) return "neznamy";
  if (OFICIALNI.some((r) => r.test(d))) return "oficialni";
  if (DUVERYHODNE.some((r) => r.test(d))) return "duveryhodny";
  return "sekundarni";
}

/** Adresa vyhledávání na Googlu. Dotaz se vždycky kóduje. */
export function googleUrl(dotaz: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(dotaz.trim())}`;
}
