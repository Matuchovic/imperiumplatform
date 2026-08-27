/**
 * Druhy notifikací. Čistá data — smí je vzít prohlížeč i server.
 */

export type Druh = "chat" | "betmail" | "kalendar" | "asistent" | "kandidati" | "support" | "ukoly";

export const DRUHY: {
  klic: Druh;
  nazev: string;
  popis: string;
  ikona: string;
  /** Výchozí stav. Co ruší víc, než pomáhá, je vypnuté. */
  vychozi: boolean;
}[] = [
  {
    klic: "chat",
    nazev: "Týmový chat",
    popis: "Nová zpráva v kanálu, který sleduješ.",
    ikona: "message-circle",
    vychozi: true,
  },
  {
    klic: "betmail",
    nazev: "Betmail",
    popis: "Nová zpráva v interní poště.",
    ikona: "mail-opened",
    vychozi: true,
  },
  {
    klic: "kandidati",
    nazev: "Kandidáti ke schválení",
    popis: "Motor našel příležitost, která čeká na tvoje rozhodnutí.",
    ikona: "target",
    vychozi: true,
  },
  {
    klic: "support",
    nazev: "Dotazy klientů",
    popis: "Nový dotaz v podpoře.",
    ikona: "lifebuoy",
    vychozi: true,
  },
  {
    klic: "kalendar",
    nazev: "Kalendář",
    popis: "Připomenutí patnáct minut před událostí.",
    ikona: "calendar",
    vychozi: true,
  },
  {
    klic: "ukoly",
    nazev: "Úkoly",
    popis: "Ráno v den termínu a když termín uplyne.",
    ikona: "checkbox",
    vychozi: true,
  },
  {
    klic: "asistent",
    nazev: "Asistent",
    popis: "Návrhy akcí a upozornění na neobvyklá čísla. Chodí častěji než ostatní.",
    ikona: "sparkles",
    vychozi: false,
  },
];

export type Volby = Record<Druh, boolean> & {
  ticho_od: string | null;
  ticho_do: string | null;
};

export const VYCHOZI_VOLBY: Volby = {
  chat: true, betmail: true, kandidati: true, support: true,
  kalendar: true, ukoly: true, asistent: false,
  ticho_od: null, ticho_do: null,
};

/**
 * Je teď tichá hodina?
 *
 * Rozsah přes půlnoc (22:00–07:00) se pozná podle toho, že začátek
 * je později než konec — tehdy platí obě strany půlnoci.
 */
export function jeTicho(od: string | null, do_: string | null, ted = new Date()): boolean {
  if (!od || !do_) return false;

  const minuty = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };

  const ted_ = ted.getHours() * 60 + ted.getMinutes();
  const a = minuty(od);
  const b = minuty(do_);

  return a <= b ? ted_ >= a && ted_ < b : ted_ >= a || ted_ < b;
}

/** Popis zařízení z hlavičky prohlížeče. Pro rozlišení odběrů. */
export function nazevZarizeni(ua: string): string {
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "neznámé zařízení";
}
