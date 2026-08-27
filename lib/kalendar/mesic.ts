/**
 * Sestavení měsíční mřížky. Čisté funkce — jdou otestovat bez
 * databáze i bez prohlížeče.
 */

export type Den = {
  datum: string;      // RRRR-MM-DD
  cislo: number;
  jinyMesic: boolean;
  dnes: boolean;
  vikend: boolean;
};

const MESICE = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

export const DNY = ["po", "út", "st", "čt", "pá", "so", "ne"];

export const nazevMesice = (rok: number, mesic: number) => `${MESICE[mesic]} ${rok}`;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const dnesIso = () => iso(new Date());

/**
 * Mřížka vždy začíná pondělím a má celé týdny — jinak by se sloupce
 * rozjely a dny by nesedely pod svými zkratkami.
 */
export function mrizka(rok: number, mesic: number, dnes: string): Den[] {
  const prvni = new Date(rok, mesic, 1);
  // getDay() vrací 0 pro neděli, potřebujeme pondělí jako nulu.
  const posun = (prvni.getDay() + 6) % 7;

  const start = new Date(rok, mesic, 1 - posun);
  const dny: Den[] = [];

  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const den = d.getDay();
    dny.push({
      datum: iso(d),
      cislo: d.getDate(),
      jinyMesic: d.getMonth() !== mesic,
      dnes: iso(d) === dnes,
      vikend: den === 0 || den === 6,
    });
  }

  // Poslední týden se zahodí, když celý patří jinému měsíci.
  const posledni = dny.slice(35);
  return posledni.every((d) => d.jinyMesic) ? dny.slice(0, 35) : dny;
}

export function posunMesic(rok: number, mesic: number, o: number) {
  const d = new Date(rok, mesic + o, 1);
  return { rok: d.getFullYear(), mesic: d.getMonth() };
}

/** Čas do čitelné podoby: „9:00 – 11:30" nebo „celý den". */
export function cas(od: string | null, do_: string | null, celyDen: boolean): string {
  if (celyDen) return "celý den";
  if (!od) return "";
  const zkrat = (t: string) => t.slice(0, 5);
  return do_ ? `${zkrat(od)} – ${zkrat(do_)}` : zkrat(od);
}

/** Rozsah měsíce pro dotaz do databáze. */
export function rozsah(rok: number, mesic: number) {
  const od = new Date(rok, mesic, 1);
  const do_ = new Date(rok, mesic + 1, 0);
  return { od: iso(od), do: iso(do_) };
}
