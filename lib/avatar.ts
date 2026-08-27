/**
 * Avatary.
 *
 * Iniciály na barevném podkladu místo šedé siluety. Panáček vypadá
 * stejně u všech a v seznamu se v něm nedá orientovat.
 *
 * Paleta je záměrně bez jantarové a červené — ty v systému znamenají
 * „pozor" a „chyba". Avatar s takovou barvou by tvrdil něco,
 * co neplatí.
 */

export type Efekt = "zadny" | "kruh" | "puls" | "jadro" | "koruna" | "sken";

/** Studené tóny, žádný nesplyne se stavovou barvou. */
export const BARVY = [
  { pozadi: "#1e6b4a", text: "#d8f7e6" },
  { pozadi: "#1c5f6b", text: "#d6f2f7" },
  { pozadi: "#2a5a8a", text: "#dbeaf9" },
  { pozadi: "#3f4d7a", text: "#e2e6f7" },
  { pozadi: "#155e52", text: "#d4f3ec" },
  { pozadi: "#4a3f6b", text: "#e8e3f7" },
  { pozadi: "#2d6b5f", text: "#d9f5ef" },
  { pozadi: "#38566b", text: "#dfeaf2" },
] as const;

/**
 * Barva ze jména. Součet kódů znaků modulo počet barev — stejné
 * jméno má vždycky stejnou barvu, i po znovunačtení stránky.
 */
export function barvaZeJmena(jmeno: string) {
  let soucet = 0;
  for (let i = 0; i < jmeno.length; i++) soucet += jmeno.charCodeAt(i);
  return BARVY[soucet % BARVY.length];
}

/**
 * Iniciály. U jednoho slova první dvě písmena, u víc slov první
 * a poslední — „Jan Novák" dá JN, ne JA.
 */
export function iniciály(jmeno: string | null | undefined): string {
  const casti = (jmeno ?? "").trim()
    // Číslice a znaky ze jmen firem do iniciál nepatří.
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (casti.length === 0) return "?";
  if (casti.length === 1) return casti[0].slice(0, 2).toUpperCase();
  return (casti[0][0] + casti[casti.length - 1][0]).toUpperCase();
}

export const EFEKTY: { klic: Efekt; nazev: string; popis: string }[] = [
  { klic: "zadny", nazev: "Žádný", popis: "Jen iniciály." },
  { klic: "kruh", nazev: "Prstenec", popis: "Přerušovaný kruh, který se otáčí." },
  { klic: "puls", nazev: "Puls", popis: "Záře, která pomalu sílí a slábne." },
  { klic: "jadro", nazev: "Jádro", popis: "Dva protiběžné prstence jako u asistenta." },
  { klic: "koruna", nazev: "Koruna", popis: "Malá koruna nad kolečkem." },
  { klic: "sken", nazev: "Sken", popis: "Světlo přejede přes kolečko." },
];
