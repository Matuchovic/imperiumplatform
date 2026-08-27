/**
 * Katalog agentů.
 *
 * Data bez závislostí — smí je vzít prohlížeč i server.
 * Co agent umí a čeho se nedotkne je součást definice, ne
 * poznámka v dokumentaci.
 */

export type Stav = "bezi" | "ceka" | "stoji" | "priprava" | "chyba";

export type Agent = {
  klic: string;
  nazev: string;
  role: string;
  ikona: string;
  barva: string;
  popis: string;
  /** Proč vůbec existuje. Bez toho je to jen seznam funkcí. */
  proc: string;
  umi: { ikona: string; text: string }[];
  /** Čeho se agent nedotkne. Rozhodnutí, ne chybějící funkce. */
  nesmi: string[];
  /** Doporučený interval v minutách. Null = ruční spuštění. */
  interval: number | null;
  /** Hotový, nebo teprve v přípravě. */
  pripraven: boolean;
};

export const KATALOG: Agent[] = [
  {
    klic: "retence",
    nazev: "Retenční agent",
    role: "Hlídá klienty v propadu",
    ikona: "heart-handshake",
    barva: "#7ef0a8",
    popis: "Sleduje každého klienta a ozve se dřív, než se rozhodne odejít.",
    proc:
      "V prvních pětačtyřiceti dnech je pod nulou 43 % nováčků proti 31 % dlouhodobých. " +
      "Nováček nemá naspořený polštář a odchází první.",
    umi: [
      { ikona: "trending-down", text: "Pozná propad dřív než klient sám." },
      { ikona: "clock", text: "Hlídá, kdy naposledy někdo klientovi napsal — ticho je varování." },
      { ikona: "message-2", text: "Připraví, co říct: konkrétní čísla toho klienta, ne obecné fráze." },
      { ikona: "user-check", text: "Neposílá nic sám. Připraví podklad a člověk zavolá." },
    ],
    nesmi: [
      "Nekontaktuje klienta sám.",
      "Nemění doporučenou jednotku ani bankroll.",
      "Nevymýšlí si čísla — když data nemá, řekne to.",
    ],
    interval: 360,
    pripraven: true,
  },
  {
    klic: "support",
    nazev: "Support agent",
    role: "Třídí dotazy a píše návrhy",
    ikona: "lifebuoy",
    barva: "#ffc94a",
    popis: "Bere dotazy klientů, roztřídí je a na běžné připraví odpověď.",
    proc:
      "Doba první odpovědi rozhoduje o spokojenosti víc než samotné řešení. " +
      "Roztřídit frontu je práce, kterou nikdo dělat nechce.",
    umi: [
      { ikona: "arrows-sort", text: "Roztřídí podle naléhavosti — technický problém není dotaz na cenu." },
      { ikona: "writing", text: "Na opakované dotazy připraví odpověď z toho, co jsme už odpovídali." },
      { ikona: "alert-triangle", text: "Dotazy o penězích a smlouvách nechá člověku." },
      { ikona: "chart-dots", text: "Sleduje, na co se ptají nejčastěji — to jsou náměty pro obsah." },
    ],
    nesmi: [
      "Neodpovídá sám, jen připraví návrh.",
      "Nedotýká se dotazů o výplatách a smlouvách.",
      "Neslibuje termíny ani řešení.",
    ],
    interval: 30,
    pripraven: true,
  },
  {
    klic: "marketing",
    nazev: "Marketing agent",
    role: "Kampaně na vlastní databázi",
    ikona: "speakerphone",
    barva: "#60a5fa",
    popis: "Pracuje s kontakty, které už máme. Segmentuje, píše, hlídá souhlasy.",
    proc:
      "Oslovit člověka, který nás už zná, je několikanásobně levnější než získat nového. " +
      "Databáze bez souhlasů je ale bezcenná.",
    umi: [
      { ikona: "users", text: "Rozděluje databázi podle chování, ne podle data zápisu." },
      { ikona: "mail", text: "Píše text kampaně a připraví ho ke schválení." },
      { ikona: "shield-check", text: "Bez souhlasu nikomu nenapíše. Odhlášení platí okamžitě." },
      { ikona: "calendar", text: "Navrhuje, kdy odeslat — podle toho, kdy lidé otvírají." },
    ],
    nesmi: [
      "Neodesílá kampaň bez schválení.",
      "Nepíše nikomu bez souhlasu podle zákona 480/2004.",
      "Neslibuje zisk ani konkrétní výsledky.",
    ],
    interval: null,
    pripraven: true,
  },
  {
    klic: "tiktok",
    nazev: "TikTok agent",
    role: "Obsah a komentáře",
    ikona: "brand-tiktok",
    barva: "#ff5b7f",
    popis: "Sleduje trendy, z našich dat vymýšlí náměty a píše scénáře.",
    proc:
      "TikTok hazardní obsah dusí, takže agent staví na tom, co dělat smíme: " +
      "čísla z našeho systému, ne sliby výdělku.",
    umi: [
      { ikona: "chart-line", text: "Hlídá, co v oboru funguje a co už vyčpělo." },
      { ikona: "bulb", text: "Z každého datového jevu udělá námět." },
      { ikona: "file-text", text: "Píše scénář po vteřinách, s titulky a popiskem." },
      { ikona: "message-circle", text: "Třídí komentáře a možné klienty posílá do kontaktů." },
    ],
    nesmi: [
      "Nepublikuje bez schválení.",
      "Neukazuje konkrétní tipy ani kurzy.",
      "Neslibuje zisk a nemluví k publiku pod osmnáct let.",
    ],
    interval: 720,
    pripraven: false,
  },
  {
    klic: "instagram",
    nazev: "Instagram agent",
    role: "Reels, mřížka, stories",
    ikona: "brand-instagram",
    barva: "#c4a2ff",
    popis: "Jiný formát než TikTok — mřížka drží dojem z profilu.",
    proc:
      "Starší publikum s vyšší kupní silou. Vymýšlet obsah dvakrát nemá smysl, " +
      "agent sdílí náměty s TikTokem a mění jen formu.",
    umi: [
      { ikona: "layout-grid", text: "Hlídá, aby mřížka profilu držela pohromadě." },
      { ikona: "movie", text: "Přebírá scénáře z TikToku a upravuje je na jiné tempo." },
      { ikona: "circle-dashed", text: "Navrhuje stories z běžného provozu." },
      { ikona: "bookmark", text: "Sleduje uložení místo lajků — to je signál, že obsah stál za to." },
    ],
    nesmi: [
      "Nepublikuje bez schválení.",
      "Neukazuje konkrétní tipy ani kurzy.",
      "Nekopíruje TikTok jedna ku jedné.",
    ],
    interval: 720,
    pripraven: false,
  },
];

export const agentPodleKlice = (k: string): Agent | undefined =>
  KATALOG.find((a) => a.klic === k);

export const BARVY_STAVU: Record<Stav, { nazev: string; barva: string }> = {
  bezi: { nazev: "Běží", barva: "#7ef0a8" },
  ceka: { nazev: "Čeká na schválení", barva: "#ffc94a" },
  stoji: { nazev: "Stojí", barva: "#8fa396" },
  priprava: { nazev: "V přípravě", barva: "#5b6c61" },
  chyba: { nazev: "Chyba", barva: "#ff8a8a" },
};

/** Kdy agent poběží příště. */
export function pristiBeh(posledni: string | null, intervalMin: number | null): Date | null {
  if (!intervalMin) return null;
  const od = posledni ? new Date(posledni) : new Date();
  return new Date(od.getTime() + intervalMin * 60_000);
}

/** Za jak dlouho, česky. */
export function zaJakDlouho(kdy: Date | null, ted = new Date()): string {
  if (!kdy) return "ručně";

  const minut = Math.round((kdy.getTime() - ted.getTime()) / 60_000);
  if (minut <= 0) return "každou chvíli";
  if (minut < 60) return `za ${minut} min`;

  const hodin = Math.round(minut / 60);
  if (hodin < 24) return `za ${hodin} ${hodin === 1 ? "hodinu" : hodin < 5 ? "hodiny" : "hodin"}`;

  const dni = Math.round(hodin / 24);
  return `za ${dni} ${dni === 1 ? "den" : dni < 5 ? "dny" : "dní"}`;
}

/** Jak dávno, česky. */
export function jakDavno(kdy: string | null, ted = new Date()): string {
  if (!kdy) return "nikdy";

  const minut = Math.round((ted.getTime() - new Date(kdy).getTime()) / 60_000);
  if (minut < 1) return "právě teď";
  if (minut < 60) return `před ${minut} min`;

  const hodin = Math.round(minut / 60);
  if (hodin < 24) return `před ${hodin} h`;

  const dni = Math.round(hodin / 24);
  return `před ${dni} ${dni === 1 ? "dnem" : "dny"}`;
}
