/**
 * API klíče — čistá logika.
 *
 * Bez závislostí, aby šla otestovat. Vlastní kryptografie je
 * vedle v `hash.ts`, protože potřebuje node:crypto.
 */

/** Předpona podle prostředí. Ostrý a testovací klíč musí jít rozlišit na první pohled. */
export type Druh = "live" | "test";

/**
 * Oprávnění.
 *
 * Zápisová jsou oddělená schválně — web má zakládat kontakty,
 * ne číst bankroll. Kdo dá klíči všechno, obchází celý smysl.
 */
export const OPRAVNENI = {
  "kontakty:zapis": {
    nazev: "Zakládat kontakty",
    popis: "Formulář na webu vytvoří kontakt v databázi.",
    zapis: true,
  },
  "podpora:zapis": {
    nazev: "Zakládat dotazy",
    popis: "Kontaktní formulář vytvoří dotaz v podpoře.",
    zapis: true,
  },
  "statistiky:cteni": {
    nazev: "Číst statistiky",
    popis: "Veřejná čísla pro web — počet klientů, CLV, výkonnost.",
    zapis: false,
  },
  "obsah:cteni": {
    nazev: "Číst obsah",
    popis: "Veřejné texty a novinky publikované ze systému.",
    zapis: false,
  },
} as const;

export type Opravneni = keyof typeof OPRAVNENI;

export const VSECHNA_OPRAVNENI = Object.keys(OPRAVNENI) as Opravneni[];

/**
 * Co klíč nikdy neumožní.
 *
 * Není to seznam k odškrtnutí — jsou to věci, které v API vůbec
 * nemají koncový bod. Kdyby je někdo přidal, testy spadnou.
 */
export const NIKDY = [
  "Číst hesla, trezor ani bankroll klientů.",
  "Měnit role, faktury ani výplaty.",
  "Odesílat kampaně nebo tipy klientům.",
  "Mazat cokoli.",
];

export const platneOpravneni = (o: string[]): o is Opravneni[] =>
  o.length > 0 && o.every((x) => x in OPRAVNENI);

/** Má klíč zápisové oprávnění? Podklad pro varování v rozhraní. */
export const maZapis = (o: Opravneni[]): boolean =>
  o.some((x) => OPRAVNENI[x].zapis);

/**
 * Otisk pro zobrazení.
 *
 * Prvních osm znaků a poslední čtyři. Podle nich se klíč pozná
 * v seznamu i v protokolu, ale složit se z toho nedá.
 */
export function otisk(klic: string): string {
  if (klic.length < 16) return "•".repeat(klic.length);
  return `${klic.slice(0, 12)}${"•".repeat(20)}${klic.slice(-4)}`;
}

/**
 * Kontrola domény.
 *
 * Hvězdička nahrazuje jednu úroveň, ne libovolný počet — jinak by
 * `*.example.com` sedělo i na `zlo.example.com.utocnik.cz`.
 */
export function domenaSedi(povolene: string[], puvod: string | null): boolean {
  // Prázdný seznam znamená bez omezení. Rozhraní na to upozorní.
  if (povolene.length === 0) return true;
  if (!puvod) return false;

  let host: string;
  try {
    host = new URL(puvod).hostname.toLowerCase();
  } catch {
    // Bez schématu to není platný původ.
    return false;
  }

  return povolene.some((p) => {
    const vzor = p.trim().toLowerCase();
    if (!vzor) return false;
    if (vzor === host) return true;

    if (vzor.startsWith("*.")) {
      const zbytek = vzor.slice(2);
      if (!host.endsWith("." + zbytek)) return false;
      // Právě jedna úroveň navíc.
      const pred = host.slice(0, host.length - zbytek.length - 1);
      return pred.length > 0 && !pred.includes(".");
    }
    return false;
  });
}

/** Vypršel klíč? */
export const vyprsel = (do_: string | null, ted = new Date()): boolean =>
  Boolean(do_ && new Date(do_) < ted);

export type Stav = "aktivni" | "spici" | "vyprsel" | "odvolany";

/**
 * Stav klíče.
 *
 * Nepoužitý klíč je riziko bez užitku — nikdo si sám od sebe
 * nevzpomene ho odvolat, takže na sebe musí upozornit.
 */
export function stavKlice(
  k: { odvolany_at: string | null; plati_do: string | null; posledni_pouziti: string | null },
  ted = new Date()
): Stav {
  if (k.odvolany_at) return "odvolany";
  if (vyprsel(k.plati_do, ted)) return "vyprsel";

  if (k.posledni_pouziti) {
    const dni = (ted.getTime() - new Date(k.posledni_pouziti).getTime()) / 864e5;
    if (dni > 14) return "spici";
  }
  return "aktivni";
}

export const BARVY_STAVU: Record<Stav, string> = {
  aktivni: "#7ef0a8",
  spici: "#ffc94a",
  vyprsel: "#ff8a8a",
  odvolany: "#8fa396",
};
