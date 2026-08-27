/**
 * Převod českého čísla účtu na IBAN.
 *
 * QR platba podle standardu SPD vyžaduje IBAN, ne domácí tvar.
 * Převod je čistá aritmetika, ale snadno se v něm chybuje —
 * proto vlastní funkce s testy, ne odhad.
 */

/**
 * Rozpad čísla účtu.
 *
 * Tvar je [předčíslí-]číslo/kód banky. Předčíslí bývá prázdné.
 */
export function rozlozUcet(ucet: string): {
  predcisli: string; cislo: string; banka: string;
} | null {
  const cisty = ucet.replace(/\s/g, "");
  const m = cisty.match(/^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/);
  if (!m) return null;
  return { predcisli: m[1] ?? "", cislo: m[2], banka: m[3] };
}

/**
 * Kontrola váženým součtem.
 *
 * Česká čísla účtů mají vlastní kontrolní mechanismus — váhy
 * 6,3,7,9,10,5,8,4,2,1 zprava a součet dělitelný jedenácti.
 * Překlep se tak pozná dřív, než peníze odejdou jinam.
 */
export function platnyUcet(cast: string): boolean {
  const VAHY = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1];
  const cislice = cast.padStart(10, "0").split("").map(Number);
  const soucet = cislice.reduce((a, c, i) => a + c * VAHY[i], 0);
  return soucet % 11 === 0;
}

/** Zbytek po dělení 97 po číslicích — celé číslo by přeteklo. */
function mod97(s: string): number {
  let zbytek = 0;
  for (const z of s) zbytek = (zbytek * 10 + Number(z)) % 97;
  return zbytek;
}

/**
 * IBAN z českého čísla účtu.
 *
 * CZ + kontrolní číslice + kód banky + předčíslí (6) + číslo (10).
 */
export function naIban(ucet: string): string | null {
  const c = rozlozUcet(ucet);
  if (!c) return null;

  const zaklad = c.banka + c.predcisli.padStart(6, "0") + c.cislo.padStart(10, "0");
  // Pro výpočet se CZ přesune dozadu a písmena nahradí čísly: C=12, Z=35.
  const kontrola = 98 - mod97(zaklad + "1235" + "00");

  return `CZ${String(kontrola).padStart(2, "0")}${zaklad}`;
}

/** IBAN po čtveřicích, jak se píše na doklady. */
export const formatujIban = (iban: string): string =>
  iban.replace(/(.{4})/g, "$1 ").trim();
