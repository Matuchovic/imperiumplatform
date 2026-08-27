/**
 * Výpočet výplaty.
 *
 * Záměrně nepočítá daně ani odvody — to je práce účetní. Systém
 * spočítá hrubou mzdu, srážky a zálohy; čistou doplní ten, kdo
 * za ni odpovídá.
 */

export type Stav = "rozpracovano" | "ke_schvaleni" | "schvaleno" | "vyplaceno";

export const STAVY: Record<Stav, { nazev: string; barva: string }> = {
  rozpracovano: { nazev: "Rozpracováno", barva: "#8fa396" },
  ke_schvaleni: { nazev: "Ke schválení", barva: "#ffc94a" },
  schvaleno: { nazev: "Schváleno", barva: "#60a5fa" },
  vyplaceno: { nazev: "Vyplaceno", barva: "#7ef0a8" },
};

export type Radek = {
  hodiny: number | null;
  sazba: number | null;
  mesicni: number | null;
  premie: number;
  srazky: number;
  zalohy: number;
  /** Ruční přepis hrubé. Když je vyplněný, má přednost před výpočtem. */
  hrube: number | null;
};

/**
 * Hrubá mzda.
 *
 * Ruční hodnota má přednost — někdy je potřeba zapsat částku,
 * která z hodin nevyjde. Jinak se sečte měsíční plat nebo
 * hodiny krát sazba, plus prémie.
 */
export function hruba(r: Radek): number {
  if (r.hrube !== null && r.hrube !== undefined) return zaokrouhli(r.hrube);

  const zaklad = r.mesicni ?? ((r.hodiny ?? 0) * (r.sazba ?? 0));
  return zaokrouhli(zaklad + (r.premie ?? 0));
}

/** Kolik se skutečně pošle: hrubá bez srážek a už vyplacených záloh. */
export function kVyplate(r: Radek): number {
  return zaokrouhli(hruba(r) - (r.srazky ?? 0) - (r.zalohy ?? 0));
}

/** Zaokrouhlení na celé koruny. Halíře se v mzdách nepoužívají. */
export const zaokrouhli = (n: number): number => Math.round(n);

/**
 * Co je na řádku špatně.
 *
 * Kontrola před výplatou chytí chyby dřív než banka. Prázdné pole
 * není chyba — řádek může být rozpracovaný.
 */
export function vyhrady(r: Radek): string[] {
  const v: string[] = [];

  if (r.mesicni === null && (r.hodiny === null || r.sazba === null)) {
    v.push("Chybí měsíční plat nebo hodiny se sazbou.");
  }
  if (r.mesicni !== null && r.hodiny !== null) {
    v.push("Vyplněný měsíční plat i hodiny — počítá se jen plat.");
  }
  // Přes 300 hodin měsíčně nikdo neodpracuje; je to překlep v řádu.
  if (r.hodiny !== null && r.hodiny > 300) {
    v.push("Přes 300 hodin za měsíc — zkontroluj řád.");
  }
  if (r.hodiny !== null && r.hodiny < 0) v.push("Záporné hodiny.");
  if (r.sazba !== null && r.sazba < 0) v.push("Záporná sazba.");
  if (kVyplate(r) < 0) v.push("Srážky a zálohy převyšují hrubou mzdu.");

  return v;
}

/** Souhrn za období. */
export function souhrn(radky: Radek[]) {
  return {
    hrube: radky.reduce((a, r) => a + hruba(r), 0),
    srazky: radky.reduce((a, r) => a + (r.srazky ?? 0), 0),
    zalohy: radky.reduce((a, r) => a + (r.zalohy ?? 0), 0),
    kVyplate: radky.reduce((a, r) => a + kVyplate(r), 0),
    hodiny: radky.reduce((a, r) => a + (r.hodiny ?? 0), 0),
  };
}

const MESICE = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

/** Období jako „srpen 2026". */
export function nazevObdobi(iso: string): string {
  const d = new Date(iso);
  return `${MESICE[d.getMonth()]} ${d.getFullYear()}`;
}

/** První den měsíce — tak se období ukládá. */
export function prvniDen(rok: number, mesic: number): string {
  return `${rok}-${String(mesic + 1).padStart(2, "0")}-01`;
}

/** Posun o měsíc zpět nebo vpřed. */
export function posun(iso: string, o: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + o);
  return prvniDen(d.getFullYear(), d.getMonth());
}

/** Částka v korunách, bez halířů. */
export const kc = (n: number): string => `${zaokrouhli(n).toLocaleString("cs-CZ")} Kč`;
