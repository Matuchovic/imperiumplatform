/**
 * Betmail — pomocné funkce. Bez závislostí, smí je vzít prohlížeč.
 */

export type Slozka = "dorucene" | "odeslane" | "archiv" | "kos";

export const SLOZKY: { klic: Slozka; nazev: string; ikona: string }[] = [
  { klic: "dorucene", nazev: "Doručené", ikona: "inbox" },
  { klic: "odeslane", nazev: "Odeslané", ikona: "send" },
  { klic: "archiv", nazev: "Archiv", ikona: "archive" },
  { klic: "kos", nazev: "Koš", ikona: "trash" },
];

export const PRIORITY: Record<string, { nazev: string; barva: string }> = {
  vysoka: { nazev: "Vysoká", barva: "#ff8a8a" },
  bezna: { nazev: "Běžná", barva: "#8fa396" },
  nizka: { nazev: "Nízká", barva: "#5b6c61" },
};

/** Reakce. Málo možností je lepší než mnoho — vybere se rychleji. */
export const REAKCE = ["👍", "✅", "👀", "🔥", "❓", "🙏"] as const;

/**
 * Čas zprávy podle stáří.
 *
 * Dnešní zpráva potřebuje hodinu, včerejší slovo, starší datum.
 * Plné datum a čas u všeho je šum, ve kterém se hůř hledá.
 */
export function kdyZprava(iso: string, ted = new Date()): string {
  const d = new Date(iso);
  const rozdil = ted.getTime() - d.getTime();
  const cas = d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });

  if (d.toDateString() === ted.toDateString()) return cas;

  const vcera = new Date(ted);
  vcera.setDate(vcera.getDate() - 1);
  if (d.toDateString() === vcera.toDateString()) return `včera ${cas}`;

  if (rozdil < 7 * 864e5) {
    return d.toLocaleDateString("cs-CZ", { weekday: "short" }) + ` ${cas}`;
  }
  if (d.getFullYear() === ted.getFullYear()) {
    return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
  }
  return d.toLocaleDateString("cs-CZ");
}

/** Náhled těla v seznamu. Zalomení a mezery navíc jen zabírají místo. */
export function nahled(telo: string, delka = 110): string {
  const jeden = telo.replace(/\s+/g, " ").trim();
  return jeden.length <= delka ? jeden : jeden.slice(0, delka).trimEnd() + "…";
}

/** Předmět odpovědi. „Re:" se nehromadí. */
export const predmetOdpovedi = (p: string): string =>
  /^re:\s/i.test(p) ? p : `Re: ${p}`;

/** Předmět přeposlání. */
export const predmetPreposlani = (p: string): string =>
  /^fwd:\s/i.test(p) ? p : `Fwd: ${p.replace(/^re:\s*/i, "")}`;
