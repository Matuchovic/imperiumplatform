/**
 * Kdo v parku co smí.
 *
 * Vedení vidí celý park a spravuje doklady. Ostatní z týmu vidí
 * jen svá přiřazená vozidla a smí u nich zapisovat jízdy a stav
 * tachometru. Klient do parku nesmí vůbec.
 *
 * Filtruje se na serveru, ne v rozhraní — skrytá tlačítka jsou
 * jen dekorace, dotaz jde poslat i bez nich.
 */

export type UrovenPristupu = "vedeni" | "ridic" | "zadny";

const VEDENI = ["ceo", "vyvojar"];
const TYM = ["manazer", "marketing", "scout", "ucetni"];

export function uroven(role: string): UrovenPristupu {
  if (VEDENI.includes(role)) return "vedeni";
  if (TYM.includes(role)) return "ridic";
  return "zadny";
}

/** Smí zakládat, mazat a upravovat doklady? */
export const smiSpravovat = (role: string): boolean => uroven(role) === "vedeni";

/** Smí do parku vůbec? */
export const smiVstoupit = (role: string): boolean => uroven(role) !== "zadny";

/** Smí zapisovat jízdy a stav tachometru u tohohle vozidla? */
export function smiZapsatJizdu(role: string, ridicVozidla: string | null, jaId: string): boolean {
  if (uroven(role) === "vedeni") return true;
  if (uroven(role) === "zadny") return false;
  // Řidič jen u svého auta. Cizí vozidlo se ho netýká.
  return ridicVozidla === jaId;
}
