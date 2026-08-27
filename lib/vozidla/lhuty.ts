/**
 * Hlídání lhůt a výpočty vozového parku.
 *
 * Bez závislostí — smí to vzít prohlížeč i server.
 */

export type Stav = "aktivni" | "servis" | "odstaveno" | "vyrazeno";
export type Nalehavost = "propadle" | "brzy" | "blizi" | "ok" | "nezadano";

export const STAVY: Record<Stav, { nazev: string; barva: string }> = {
  aktivni: { nazev: "Aktivní", barva: "#7ef0a8" },
  servis: { nazev: "V servisu", barva: "#ffc94a" },
  odstaveno: { nazev: "Odstaveno", barva: "#8fa396" },
  vyrazeno: { nazev: "Vyřazeno", barva: "#5b6c61" },
};

export const PALIVA: Record<string, string> = {
  benzin: "Benzin", nafta: "Nafta", elektro: "Elektro",
  hybrid: "Hybrid", lpg: "LPG", cng: "CNG",
};

export const DRUHY_SERVISU: Record<string, string> = {
  servis: "Pravidelný servis", oprava: "Oprava", pneu: "Přezutí",
  stk: "STK a emise", myti: "Mytí a péče", jine: "Jiné",
};

export const ZAVAZNOSTI: Record<string, { nazev: string; barva: string }> = {
  drobne: { nazev: "Drobné", barva: "#8fa396" },
  stredni: { nazev: "Střední", barva: "#ffc94a" },
  vazne: { nazev: "Vážné", barva: "#ff8a8a" },
};

/**
 * Naléhavost lhůty.
 *
 * Třicet dní je hranice, kdy má smysl objednat termín. Sedm dní
 * je poslední chvíle — kdo si toho všimne později, jezdí načerno.
 */
export function naleha(datum: string | null, dnes = new Date()): Nalehavost {
  if (!datum) return "nezadano";

  const cil = new Date(datum);
  const dni = Math.floor((cil.getTime() - dnes.setHours(0, 0, 0, 0)) / 864e5);

  if (dni < 0) return "propadle";
  if (dni <= 7) return "brzy";
  if (dni <= 30) return "blizi";
  return "ok";
}

export const BARVA_LHUTY: Record<Nalehavost, string> = {
  propadle: "#ff8a8a",
  brzy: "#ff8a8a",
  blizi: "#ffc94a",
  ok: "#7ef0a8",
  nezadano: "#5b6c61",
};

/** Zbývá do lhůty, česky. */
export function zbyva(datum: string | null, dnes = new Date()): string {
  if (!datum) return "nezadáno";

  const cil = new Date(datum);
  const dni = Math.floor((cil.getTime() - new Date(dnes).setHours(0, 0, 0, 0)) / 864e5);

  if (dni < 0) return `po termínu o ${Math.abs(dni)} ${sklonujDny(Math.abs(dni))}`;
  if (dni === 0) return "dnes";
  if (dni === 1) return "zítra";
  if (dni <= 60) return `za ${dni} ${sklonujDny(dni)}`;

  const mesicu = Math.round(dni / 30);
  return `za ${mesicu} ${mesicu < 5 ? "měsíce" : "měsíců"}`;
}

function sklonujDny(n: number): string {
  if (n === 1) return "den";
  if (n < 5) return "dny";
  return "dní";
}

/** Nejnaléhavější lhůta vozidla — podle ní se řadí seznam. */
export function nejhorsiLhuta(v: {
  stk_do: string | null; pojisteni_do: string | null;
  znamka_do: string | null; servis_do: string | null;
}, dnes = new Date()): Nalehavost {
  const poradi: Nalehavost[] = ["propadle", "brzy", "blizi", "ok", "nezadano"];
  const vsechny = [v.stk_do, v.pojisteni_do, v.znamka_do, v.servis_do]
    .map((d) => naleha(d, new Date(dnes)));

  for (const p of poradi) if (vsechny.includes(p)) return p;
  return "nezadano";
}

/** Ujeté kilometry jízdy. */
export const ujeto = (start: number, cil: number): number => Math.max(0, cil - start);

/** SPZ ve tvaru, v jakém se porovnává. */
export const normalizujSpz = (s: string): string =>
  s.toUpperCase().replace(/\s+/g, "");
