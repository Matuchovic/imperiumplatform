/**
 * Položky faktury a výpočet částek.
 *
 * Sazby DPH podle českého zákona. Neplátce vystavuje bez daně —
 * pak je sazba nula a na dokladu se DPH vůbec neuvádí.
 */

export type Polozka = {
  nazev: string;
  mnozstvi: number;
  jednotka: string;
  cena: number;
  dph: number;
};

export const SAZBY_DPH = [0, 12, 21] as const;

export const JEDNOTKY = ["ks", "hod", "měsíc", "km", "kg", "služba"] as const;

export const prazdnaPolozka = (): Polozka => ({
  nazev: "", mnozstvi: 1, jednotka: "ks", cena: 0, dph: 21,
});

/** Cena položky bez daně. */
export const zaklad = (p: Polozka): number => zaokrouhli(p.mnozstvi * p.cena);

/** Daň z položky. */
export const dan = (p: Polozka): number => zaokrouhli(zaklad(p) * (p.dph / 100));

/**
 * Součty faktury.
 *
 * Daň se počítá po sazbách zvlášť, ne z celkového základu — tak
 * to vyžaduje zákon a jinak by se lišila o koruny.
 */
export function soucty(polozky: Polozka[], platceDph: boolean) {
  const bezDph = polozky.reduce((a, p) => a + zaklad(p), 0);

  if (!platceDph) {
    return { bezDph: zaokrouhli(bezDph), dph: 0, celkem: zaokrouhli(bezDph), podleSazeb: [] };
  }

  const sazby = new Map<number, { zaklad: number; dan: number }>();
  for (const p of polozky) {
    const s = sazby.get(p.dph) ?? { zaklad: 0, dan: 0 };
    s.zaklad += zaklad(p);
    s.dan += dan(p);
    sazby.set(p.dph, s);
  }

  const celkemDph = [...sazby.values()].reduce((a, s) => a + s.dan, 0);

  return {
    bezDph: zaokrouhli(bezDph),
    dph: zaokrouhli(celkemDph),
    celkem: zaokrouhli(bezDph + celkemDph),
    podleSazeb: [...sazby.entries()]
      .map(([sazba, s]) => ({ sazba, zaklad: zaokrouhli(s.zaklad), dan: zaokrouhli(s.dan) }))
      .sort((a, b) => a.sazba - b.sazba),
  };
}

export const zaokrouhli = (n: number): number => Math.round(n * 100) / 100;

/**
 * Číslo faktury.
 *
 * Rok a pořadí — 2026001. Pořadové číslo se nikdy nepoužije
 * dvakrát, i když se faktura smaže; daňový doklad musí mít
 * nepřerušenou řadu.
 */
export function dalsiCislo(rok: number, posledni: string | null): string {
  const prefix = String(rok);
  if (!posledni?.startsWith(prefix)) return `${prefix}001`;

  const poradi = Number(posledni.slice(prefix.length)) + 1;
  return `${prefix}${String(poradi).padStart(3, "0")}`;
}

/** Datum splatnosti podle počtu dní. */
export function splatnostZa(vystaveno: string, dni: number): string {
  const d = new Date(vystaveno);
  d.setDate(d.getDate() + dni);
  return d.toISOString().slice(0, 10);
}
