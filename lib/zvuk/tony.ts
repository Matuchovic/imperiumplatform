/**
 * Tóny upozornění.
 *
 * Zvuk se skládá z frekvencí, ne z nahrávky. Soubor by se musel
 * stahovat, uložit a udržovat — tohle je pár set bajtů kódu
 * a zní stejně na každém zařízení.
 *
 * Čistá data, aby to šlo otestovat bez prohlížeče.
 */

export type Druh = "upozorneni" | "zprava" | "hotovo" | "chyba" | "jemne";

export type Ton = {
  /** Frekvence v hertzích. */
  hz: number;
  /** Kdy tón začne, ve vteřinách od spuštění. */
  od: number;
  /** Jak dlouho zní. */
  delka: number;
  /** Hlasitost 0–1. */
  hlasitost: number;
  tvar?: OscillatorType;
};

/**
 * Melodie jsou krátké a v durovém trojzvuku.
 *
 * Dva až tři tóny stačí. Delší znělka při desátém zaznění
 * obtěžuje a lidé si zvuk vypnou úplně.
 */
export const MELODIE: Record<Druh, Ton[]> = {
  // Kvinta vzhůru — otevřená, něco přišlo.
  upozorneni: [
    { hz: 784, od: 0, delka: 0.09, hlasitost: 0.16 },
    { hz: 1175, od: 0.08, delka: 0.16, hlasitost: 0.13 },
  ],
  // Dva rychlé tóny, tišší. Chodí častěji než ostatní.
  zprava: [
    { hz: 880, od: 0, delka: 0.06, hlasitost: 0.11 },
    { hz: 1046, od: 0.06, delka: 0.11, hlasitost: 0.09 },
  ],
  // Trojzvuk nahoru — dokončeno.
  hotovo: [
    { hz: 523, od: 0, delka: 0.07, hlasitost: 0.13 },
    { hz: 659, od: 0.06, delka: 0.07, hlasitost: 0.13 },
    { hz: 784, od: 0.12, delka: 0.18, hlasitost: 0.12 },
  ],
  // Sestup a nižší poloha. Klesající melodie zní jako problém
  // v každé kultuře, kde se hraje hudba.
  chyba: [
    { hz: 440, od: 0, delka: 0.1, hlasitost: 0.15, tvar: "triangle" },
    { hz: 330, od: 0.1, delka: 0.2, hlasitost: 0.13, tvar: "triangle" },
  ],
  // Jediný tichý tón. Pro věci, které se dějí často.
  jemne: [{ hz: 988, od: 0, delka: 0.08, hlasitost: 0.07 }],
};

/** Jak dlouho melodie trvá. */
export const delkaMelodie = (d: Druh): number =>
  Math.max(...MELODIE[d].map((t) => t.od + t.delka));

/**
 * Vzorec vibrace v milisekundách: vibruj, pauza, vibruj…
 *
 * Android ho použije přímo. iPhone vibrace z webu neumí —
 * tam zavibruje jen systémová push notifikace.
 */
export const VIBRACE: Record<Druh, number[]> = {
  upozorneni: [18, 60, 30],
  zprava: [14],
  hotovo: [12, 40, 12, 40, 24],
  chyba: [40, 80, 40],
  jemne: [10],
};
