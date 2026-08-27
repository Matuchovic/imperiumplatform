/**
 * Betmail — interní pošta.
 *
 * Modul bez závislostí, aby ho směl vzít i prohlížeč.
 */

export type Priorita = "nizka" | "bezna" | "vysoka";

export const PRIORITY: { klic: Priorita; nazev: string; barva: string }[] = [
  { klic: "nizka", nazev: "Nízká", barva: "#5b6c61" },
  { klic: "bezna", nazev: "Běžná", barva: "#8fa396" },
  { klic: "vysoka", nazev: "Vysoká", barva: "#ffc94a" },
];

/**
 * Reakce.
 *
 * Zvolil jsem znaky, ne animované obrázky — ty by znamenaly balíček
 * navíc a stovky kilobajtů na každou zprávu. Šest je dost na to,
 * aby si člověk vybral, a málo na to, aby vybíral dlouho.
 */
export const REAKCE = ["👍", "✅", "👀", "🔥", "❓", "⚠️"] as const;

/** Náhled zprávy v seznamu. Zalomení a mezery se sloučí. */
export function utrzek(telo: string, delka = 110): string {
  const t = telo.replace(/\s+/g, " ").trim();
  return t.length <= delka ? t : `${t.slice(0, delka).trimEnd()}…`;
}

/**
 * Předmět odpovědi. Předpony se nehromadí — „Re: Re: Re:" nikdo
 * číst nechce.
 */
export const predmetOdpovedi = (p: string): string =>
  /^re:\s/i.test(p) ? p : `Re: ${p}`;

export const predmetPreposlani = (p: string): string =>
  /^fwd:\s/i.test(p) ? p : `Fwd: ${p}`;

/** Kdy zpráva přišla. Dnes čas, jindy datum. */
export function kdy(iso: string, ted = new Date()): string {
  const d = new Date(iso);
  const stejnyDen =
    d.getFullYear() === ted.getFullYear() &&
    d.getMonth() === ted.getMonth() &&
    d.getDate() === ted.getDate();

  if (stejnyDen) {
    return d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  }

  const vcera = new Date(ted);
  vcera.setDate(vcera.getDate() - 1);
  const jeVcera =
    d.getFullYear() === vcera.getFullYear() &&
    d.getMonth() === vcera.getMonth() &&
    d.getDate() === vcera.getDate();

  if (jeVcera) return "včera";
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
}
