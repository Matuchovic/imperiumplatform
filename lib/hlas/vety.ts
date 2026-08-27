/**
 * Věty, které systém umí říct.
 *
 * Pevný seznam, ne volný text. Každá věta se vygeneruje jednou
 * a uloží — ElevenLabs účtuje za znaky a stokrát vyslovit totéž
 * by byla zbytečná útrata.
 *
 * Bez závislostí, aby to šlo otestovat i použít v prohlížeči.
 */

export type Vysloveni =
  | "upozorneni" | "zprava" | "posta" | "ukol" | "faktura"
  | "podpora" | "svatek" | "hotovo" | "chyba" | "vitej";

export const VETY: Record<Vysloveni, string> = {
  upozorneni: "Máš nové upozornění.",
  zprava: "Nová zpráva v chatu.",
  posta: "Přišel ti Betmail.",
  ukol: "Máš úkol po termínu.",
  faktura: "Faktura je po splatnosti.",
  podpora: "Nový dotaz od klienta.",
  svatek: "Dnes má někdo z týmu svátek.",
  hotovo: "Hotovo.",
  chyba: "Něco se nepovedlo.",
  vitej: "Vítej zpět.",
};

/**
 * Klíč pro uložení.
 *
 * Obsahuje hlas i text — po změně hlasu se nesmí sáhnout
 * po staré nahrávce a po opravě překlepu taky ne.
 */
export function klicNahravky(v: Vysloveni, hlas: string): string {
  const otisk = jednoducheHash(`${VETY[v]}::${hlas}`);
  return `${v}-${hlas.slice(0, 8)}-${otisk}.mp3`;
}

/** Krátký otisk textu. Nejde o bezpečnost, jen o rozlišení verzí. */
function jednoducheHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Kolik znaků se celkem vygeneruje. Podklad pro odhad ceny. */
export const znakuCelkem = (): number =>
  Object.values(VETY).reduce((a, v) => a + v.length, 0);
