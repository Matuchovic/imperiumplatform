/**
 * Stavy faktur a výpočty nad nimi.
 */

export type Stav = "koncept" | "vystavena" | "zaplacena" | "stornovana";

export const STAVY: Record<Stav, { nazev: string; barva: string }> = {
  koncept: { nazev: "Koncept", barva: "#8fa396" },
  vystavena: { nazev: "Vystavena", barva: "#60a5fa" },
  zaplacena: { nazev: "Zaplacena", barva: "#7ef0a8" },
  stornovana: { nazev: "Stornována", barva: "#5b6c61" },
};

export type Faktura = {
  stav: string;
  castka: number;
  vystaveno: string;
  splatnost: string | null;
  zaplaceno_at: string | null;
};

/** Dní po splatnosti. Nula a méně znamená, že ještě neuplynula. */
export function poSplatnosti(f: Faktura, dnes = new Date()): number {
  if (f.stav !== "vystavena" || !f.splatnost) return 0;
  const spl = new Date(f.splatnost);
  spl.setHours(0, 0, 0, 0);
  const d = new Date(dnes);
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((d.getTime() - spl.getTime()) / 864e5));
}

/** Zbývá do splatnosti. Záporné číslo znamená po termínu. */
export function doSplatnosti(f: Faktura, dnes = new Date()): number | null {
  if (!f.splatnost) return null;
  const spl = new Date(f.splatnost);
  spl.setHours(0, 0, 0, 0);
  const d = new Date(dnes);
  d.setHours(0, 0, 0, 0);
  return Math.round((spl.getTime() - d.getTime()) / 864e5);
}

/**
 * Průměrná doba splatnosti.
 *
 * Kolik dní klientům trvá, než zaplatí. Metrika zdraví peněžního
 * toku — počítá se jen z uhrazených faktur, protože u nezaplacené
 * se doba ještě neuzavřela.
 */
export function prumernaDobaPlaceni(faktury: Faktura[]): number | null {
  const zaplacene = faktury.filter((f) => f.stav === "zaplacena" && f.zaplaceno_at);
  if (zaplacene.length === 0) return null;

  const soucet = zaplacene.reduce((a, f) => {
    const od = new Date(f.vystaveno).getTime();
    const do_ = new Date(f.zaplaceno_at!).getTime();
    return a + Math.max(0, Math.round((do_ - od) / 864e5));
  }, 0);

  return Math.round(soucet / zaplacene.length);
}

export function souhrn(faktury: Faktura[], dnes = new Date()) {
  const vystavene = faktury.filter((f) => f.stav === "vystavena");
  return {
    zaplaceno: faktury.filter((f) => f.stav === "zaplacena").reduce((a, f) => a + Number(f.castka), 0),
    ceka: vystavene.reduce((a, f) => a + Number(f.castka), 0),
    poSplatnosti: vystavene
      .filter((f) => poSplatnosti(f, dnes) > 0)
      .reduce((a, f) => a + Number(f.castka), 0),
    pocetPoSplatnosti: vystavene.filter((f) => poSplatnosti(f, dnes) > 0).length,
  };
}

/** Variabilní symbol z čísla faktury — jen číslice, nejvýš deset. */
export const vsZCisla = (cislo: string): string =>
  cislo.replace(/\D/g, "").slice(-10) || "0";

export const kc = (n: number): string =>
  `${Math.round(n).toLocaleString("cs-CZ")} Kč`;
