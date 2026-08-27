/**
 * Texty upomínek.
 *
 * Tři úrovně, každá důraznější. Většina klientů zaplatí po první —
 * začínat předžalobní výzvou je způsob, jak přijít o zákazníka.
 */

export type Uroven = "prvni" | "druha" | "predzalobni";

export const UROVNE: Record<Uroven, { nazev: string; popis: string; barva: string }> = {
  prvni: {
    nazev: "První upomínka",
    popis: "Vlídná. Nejspíš jen zapomněli.",
    barva: "#8fa396",
  },
  druha: {
    nazev: "Druhá upomínka",
    popis: "Důraznější, s termínem.",
    barva: "#ffc94a",
  },
  predzalobni: {
    nazev: "Předžalobní výzva",
    popis: "Poslední krok před soudem. Podle § 142a o. s. ř.",
    barva: "#ff8a8a",
  },
};

export type Podklad = {
  cislo: string;
  odberatel: string;
  castka: string;
  splatnost: string;
  dni: number;
  firma: string;
  ucet?: string;
  vs?: string;
};

export function predmet(u: Uroven, p: Podklad): string {
  if (u === "predzalobni") return `Předžalobní výzva k úhradě faktury ${p.cislo}`;
  if (u === "druha") return `Druhá upomínka — faktura ${p.cislo} po splatnosti`;
  return `Upomínka k úhradě faktury ${p.cislo}`;
}

export function telo(u: Uroven, p: Podklad): string {
  const hlavicka = `Dobrý den,`;
  const platba = p.ucet
    ? `\n\nČástku prosím uhraďte na účet ${p.ucet}${p.vs ? `, variabilní symbol ${p.vs}` : ""}.`
    : "";
  const patka = `\n\nS pozdravem\n${p.firma}`;

  if (u === "prvni") {
    return `${hlavicka}

dovolujeme si Vás upozornit, že faktura ${p.cislo} na částku ${p.castka} se splatností ${p.splatnost} zatím nebyla uhrazena.

Je možné, že platba proběhla a naše systémy ji ještě nezaznamenaly — v tom případě považujte tuto zprávu za bezpředmětnou.${platba}${patka}`;
  }

  if (u === "druha") {
    return `${hlavicka}

faktura ${p.cislo} na částku ${p.castka} je ${p.dni} dní po splatnosti a přes naši předchozí upomínku zůstává neuhrazena.

Žádáme Vás o úhradu do sedmi dnů od doručení této zprávy. Pokud platbě brání překážka, ozvěte se nám prosím a domluvíme se na řešení.${platba}${patka}`;
  }

  return `${hlavicka}

opakovaně Vás vyzýváme k úhradě faktury ${p.cislo} na částku ${p.castka} se splatností ${p.splatnost}, která je ${p.dni} dní po splatnosti.

Toto je předžalobní výzva podle § 142a občanského soudního řádu. Neuhradíte-li dlužnou částku do sedmi dnů od doručení, budeme nuceni vymáhat pohledávku soudní cestou včetně příslušenství a nákladů řízení.${platba}${patka}`;
}

/** Odkaz mailto s předvyplněnou zprávou. */
export function mailto(email: string, u: Uroven, p: Podklad): string {
  return `mailto:${encodeURIComponent(email)}` +
    `?subject=${encodeURIComponent(predmet(u, p))}` +
    `&body=${encodeURIComponent(telo(u, p))}`;
}
