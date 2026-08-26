/** Tvary webového výzkumu. Sdílené mezi poskytovatelem, nástroji i rozhraním. */

export type Kvalita = "oficialni" | "duveryhodny" | "sekundarni" | "neznamy";

export type Nalez = {
  nazev: string;
  url: string;
  utrzek?: string;
  domena: string;
  vydano?: string;
  kvalita: Kvalita;
};

export type Stranka = {
  url: string;
  domena: string;
  nazev?: string;
  text: string;
  nadpisy: string[];
  vydano?: string;
  stazeno: string;
};

export type Dotaz = {
  dotaz: string;
  maxVysledku?: number;
  /** Omezení stáří: den, tyden, mesic. */
  cerstvost?: "den" | "tyden" | "mesic";
};

export interface WebPoskytovatel {
  nazev: string;
  dostupny(): boolean;
  hledej(d: Dotaz): Promise<Nalez[]>;
}

/** Akce, kterou provede prohlížeč. Server ji jen popíše. */
export type AkceProhlizece =
  | { typ: "otevri_google"; dotaz: string; url: string }
  | { typ: "otevri_url"; url: string };

/** Co si výzkum nese mezi dotazy, aby „porovnej to" vědělo s čím. */
export type VyzkumKontext = {
  dotaz: string;
  nalezy: Nalez[];
  stranky: Stranka[];
  vznik: string;
};
