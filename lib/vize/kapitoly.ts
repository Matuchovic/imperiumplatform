/**
 * Obsah sekce Vize.
 *
 * Text je v datech, ne v komponentě — dá se doplňovat bez zásahu
 * do rozhraní a jeden překlep neshodí stránku.
 *
 * České uvozovky se píšou únikovou sekvencí. Ta uzavírací je týž
 * znak, kterým končí řetězec, a jednou už kvůli tomu spadl build.
 */

export type Blok =
  | { typ: "text"; obsah: string }
  | { typ: "nadpis"; obsah: string }
  | { typ: "seznam"; polozky: string[] }
  | { typ: "kroky"; polozky: string[] }
  | { typ: "zvyrazneni"; obsah: string }
  | { typ: "varovani"; obsah: string }
  | { typ: "citat"; obsah: string; autor?: string }
  | { typ: "cisla"; polozky: { cislo: string; popis: string }[] };

export type Pilir = {
  cislo: string;
  nazev: string;
  podtitul: string;
  ikona: string;
  barva: string;
  perex: string;
  body: { nadpis: string; text: string }[];
  pointa: string;
};

/** Tři pilíře. Na nich stojí všechno ostatní. */
export const PILIRE: Pilir[] = [
  {
    cislo: "01",
    nazev: "Management",
    podtitul: "Základ, bez kterého nic dalšího nedává smysl",
    ikona: "layout-dashboard",
    barva: "#7ef0a8",
    perex:
      "Firmu nedrží pohromadě dobrý nápad, ale to, co se kolem něj děje každý den. " +
      "Kdo komu co slíbil, kdy naposledy někdo odpověděl, komu se blíží splatnost.",
    body: [
      {
        nadpis: "Jedno místo místo pěti",
        text:
          "Klienti v tabulce, platby v mailu, domluvy v chatu, faktury u účetní. " +
          "Každá věc zvlášť funguje. Dohromady je to systém, kde nikdo neví, jak firma " +
          "stojí, dokud si někdo nesedne a hodinu to nesečte.",
      },
      {
        nadpis: "Ráno za dvě minuty",
        text:
          "Otevřeš přehled a víš, co vyžaduje zásah dnes. Ne co se stalo za měsíc — " +
          "co je potřeba udělat teď.",
      },
      {
        nadpis: "Systém si pamatuje",
        text:
          "Termín, poznámka, slib klientovi. Věci, na které se zapomíná právě proto, " +
          "že jsou drobné a je jich moc.",
      },
    ],
    pointa: "Administrativa, která se dělá sama, je ta nejlevnější hodina, co si firma koupí.",
  },
  {
    cislo: "02",
    nazev: "Marketing",
    podtitul: "Získat klienta je drahé. Udržet ho je levnější.",
    ikona: "speakerphone",
    barva: "#60a5fa",
    perex:
      "Databáze kontaktů, kampaně, souhlasy. A hlavně vědomí, že nejlepší " +
      "marketingová investice je často telefonát klientovi, který ještě neodešel.",
    body: [
      {
        nadpis: "Retence před akvizicí",
        text:
          "Ze simulace vyšlo, že v prvních pětačtyřiceti dnech je pod nulou 43 % klientů " +
          "proti 31 % u dlouhodobých. Nováček nemá naspořený polštář a odchází první. " +
          "Systém ho má najít dřív, než se rozhodne.",
      },
      {
        nadpis: "Souhlas není formalita",
        text:
          "Rozesílka bez souhlasu je porušení zákona 480/2004 a pokuta jde do statisíců. " +
          "Kampaň se proto nespustí nikomu, kdo souhlas nedal, a odhlášení platí okamžitě.",
      },
      {
        nadpis: "Kontakty s účelem",
        text:
          "U každého záznamu je napsané, k čemu tam je — interní evidence, obchodní kontakt, " +
          "nebo povolené oslovení. Bez toho posledního se na něj psát nesmí.",
      },
    ],
    pointa: "Databáze, ze které se nesmí psát, je bezcenná. Databáze se souhlasy je jmění.",
  },
  {
    cislo: "03",
    nazev: "Umělá inteligence",
    podtitul: "Od odpovídání k dělání",
    ikona: "sparkles",
    barva: "#c4a2ff",
    perex:
      "Asistent dnes umí šestadvacet nástrojů ve čtyřech režimech. Čte data, hledá " +
      "na webu, zakládá úkoly, navrhuje akce. Ale pořád čeká, až se ho někdo zeptá.",
    body: [
      {
        nadpis: "Čtyři režimy, ne jeden",
        text:
          "Rozdíl mezi dotazem na klienta a zásahem do jeho sázky není v obtížnosti, " +
          "ale v následcích. První se dá vzít zpět, druhé ne. Proto Ask jen čte, " +
          "Search hledá, Build zakládá vratné věci a Operate navrhuje ke schválení.",
      },
      {
        nadpis: "Sedm věcí nikdy",
        text:
          "Bankroll, zúčtování, role, platby, mazání auditu, zvýšení sázky, obcházení " +
          "oprávnění. Ten seznam je krátký schválně — rozšířit ho je snadné, zúžit už ne.",
      },
      {
        nadpis: "Agent nečeká",
        text:
          "Asistent odpovídá. Agent sleduje, co se děje, a ozve se sám. To je celý rozdíl " +
          "a je větší, než se zdá — ráno shrne, co se změnilo, upozorní na klienta v propadu, " +
          "připraví podklady před schůzkou.",
      },
    ],
    pointa: "Nástroj, který čeká na dotaz, je nástroj. Nástroj, který se ozve sám, je kolega.",
  },
];

export type Kapitola = {
  id: string;
  nazev: string;
  perex: string;
  ikona: string;
  bloky: Blok[];
};

export const KAPITOLY: Kapitola[] = [
  {
    id: "proc",
    nazev: "Proč",
    perex: "Odkud se to vzalo a co to má řešit.",
    ikona: "compass",
    bloky: [
      {
        typ: "text",
        obsah:
          "BETIMPERIUM není sázková aplikace. Je to systém, ve kterém běží firma — " +
          "a to je zásadní rozdíl, který stojí za to říct hned na začátku.",
      },
      {
        typ: "text",
        obsah:
          "Sázkové poradenství je jen předmět podnikání. Pod ním je úplně stejná " +
          "práce jako v jakékoli jiné firmě: vědět o klientech, hlídat peníze, " +
          "nezapomenout na to, co se slíbilo, a mít po ruce doklady, když je potřeba.",
      },
      {
        typ: "zvyrazneni",
        obsah:
          "Tip je jeden okamžik. Vztah s klientem je dva roky práce, kterou nikdo nevidí.",
      },
      { typ: "nadpis", obsah: "Čtyři důvody, proč to stálo za to" },
      {
        typ: "kroky",
        polozky: [
          "Ulehčit administrativu — ta se dělá pořád a nikdo za ni neplatí.",
          "Mít vlastní systém — nepůjčovat si cizí, který se zítra zdraží nebo skončí.",
          "Vydělat peníze — ať už poradenstvím, nebo tím systémem samotným.",
          "Dát do oběhu něco, co tady nebylo.",
        ],
      },
      {
        typ: "text",
        obsah:
          "Ten čtvrtý bod je nejtěžší a zároveň nejzajímavější. Existuje spousta " +
          "systémů na fakturaci a spousta systémů na klienty. Málokterý z nich má " +
          "uvnitř asistenta, který rozumí tomu, co firma dělá.",
      },
    ],
  },
  {
    id: "hranice",
    nazev: "Hranice",
    perex: "Co systém dělat nebude — a proč to není opomenutí.",
    ikona: "shield-check",
    bloky: [
      {
        typ: "text",
        obsah:
          "Tohle jsou rozhodnutí, ne chybějící funkce. Každé z nich má důvod " +
          "a nemá se měnit jen proto, že by to bylo pohodlné.",
      },
      {
        typ: "seznam",
        polozky: [
          "Nesází za klienta a nikdy sázet nebude. Doporučení není příkaz.",
          "Nepřevádí peníze sám. Vytvoří odkaz k platbě, potvrzuje člověk.",
          "Nepočítá daně ani odvody. To je práce účetní a chyba by stála firmu peníze.",
          "Neslibuje zisk. Sázení je riziko a systém to říká všude, kde to má smysl.",
        ],
      },
      { typ: "nadpis", obsah: "Poctivost k datům" },
      {
        typ: "text",
        obsah:
          "Když je vzorek malý, systém to řekne. Když zisk nejde odlišit od náhody, " +
          "řekne to. Když si není jistý, mlčí místo aby hádal. U ROI je vždycky " +
          "interval, ne jedno lákavé číslo.",
      },
      {
        typ: "citat",
        obsah:
          "V oboru, kde většina konkurence ukazuje vybraná čísla a slibuje výdělek, " +
          "je poctivost k datům jediná trvalá výhoda. Všechno ostatní se dá zkopírovat.",
      },
      {
        typ: "varovani",
        obsah:
          "Sázkové poradenství je regulovaná činnost. Systém pomáhá pravidla dodržovat " +
          "— auditní stopa, souhlasy, ochrana hráčů — ale odpovědnost nese firma, ne software.",
      },
    ],
  },
  {
    id: "vic-systemu",
    nazev: "Víc systémů",
    perex: "Co z toho může vzniknout dál.",
    ikona: "stack-2",
    bloky: [
      {
        typ: "text",
        obsah:
          "Systém má přes dvacet sekcí a jen čtyři z nich mají co dělat se sázením. " +
          "Zbytek — evidence, komunikace, peníze, cloud, personál, AI — potřebuje " +
          "jakákoli firma o šesti lidech.",
      },
      {
        typ: "cisla",
        polozky: [
          { cislo: "80 %", popis: "sekcí je použitelných v jakémkoli oboru" },
          { cislo: "20 %", popis: "je sázková nadstavba, oddělitelná" },
          { cislo: "1", popis: "základ, na kterém stojí obojí" },
        ],
      },
      {
        typ: "text",
        obsah:
          "To nebyla náhoda. Sázková část se dá odpojit, aniž by se přepisoval základ. " +
          "Kdyby se ukázalo, že větší hodnota je v tom zbytku, dá se to nabídnout " +
          "někomu jinému — jiné firmě, jinému oboru, jinému předmětu podnikání.",
      },
      { typ: "nadpis", obsah: "Kde by to sedělo" },
      {
        typ: "seznam",
        polozky: [
          "Malé agentury, které dnes žijí v pěti nástrojích a jednom Excelu.",
          "Firmy, kde je potřeba hlídat lhůty a doklady — služby, řemesla, správa.",
          "Kdokoli, kdo chce mít vlastní systém místo předplatného, které roste každý rok.",
        ],
      },
      {
        typ: "zvyrazneni",
        obsah:
          "Postavit jeden systém pro jednu firmu je práce. Postavit ho tak, aby z něj " +
          "mohly být tři, je rozhodnutí, které se dělá na začátku.",
      },
    ],
  },
  {
    id: "vyvoj",
    nazev: "Vývoj nekončí",
    perex: "Ani po dvaceti letech.",
    ikona: "infinity",
    bloky: [
      {
        typ: "text",
        obsah:
          "Facebook je na trhu přes dvacet let a vydává aktualizace každý týden. " +
          "Ne proto, že by ho postavili špatně — ale protože svět kolem se hýbe " +
          "a systém, který stojí, začne za dva roky překážet.",
      },
      { typ: "nadpis", obsah: "Co to znamená prakticky" },
      {
        typ: "seznam",
        polozky: [
          "Verze se mění po každé úpravě a je vidět v patičce panelu.",
          "Každá změna má jednu větu, co přinesla — ne jen číslo.",
          "Přes pět set testů hlídá, že oprava jedné věci nerozbije druhou.",
          "Auditní stopa říká, kdo co udělal, i za rok.",
        ],
      },
      {
        typ: "text",
        obsah:
          "Systém se od začátku staví na to, že se bude měnit. Proto má testy, " +
          "proto má oddělené vrstvy a proto se sázková část dá odpojit. " +
          "Nic z toho není vidět, dokud nepřijde první velká změna — a pak je to " +
          "rozdíl mezi odpolednem a měsícem.",
      },
    ],
  },
  {
    id: "zkusili",
    nazev: "Zkusili jsme to",
    perex: "Buď a nebo.",
    ikona: "flame",
    bloky: [
      {
        typ: "text",
        obsah:
          "Tenhle systém se dá číst dvěma způsoby. Jako plán, nebo jako pokus.",
      },
      {
        typ: "text",
        obsah:
          "Poctivější je ten druhý. Nikdo neví, jestli poradenství vyjde, jestli " +
          "se systém bude prodávat, jestli agenti budou dělat to, co si od nich " +
          "slibujeme. Kdo tvrdí opak, buď lže, nebo si to ještě nezkusil.",
      },
      {
        typ: "citat",
        obsah:
          "Buď to vyjde a máme firmu s vlastním systémem, nebo nevyjde a máme systém, " +
          "který umíme postavit znovu a líp. Obojí je lepší než nezkusit to.",
      },
      { typ: "nadpis", obsah: "Co už stojí" },
      {
        typ: "cisla",
        polozky: [
          { cislo: "23", popis: "sekcí v provozu" },
          { cislo: "516", popis: "testů, které hlídají chyby" },
          { cislo: "26", popis: "nástrojů asistenta" },
          { cislo: "7", popis: "rolí s oprávněními" },
        ],
      },
      { typ: "nadpis", obsah: "Co je před námi" },
      {
        typ: "kroky",
        polozky: [
          "Rozjet motor hodnoty — dnes najde nula kandidátů, má málo nabídek na zápas.",
          "Uzavřít okruh: kandidát, schválení, tiket, vyhodnocení, CLV.",
          "Klientský portál — klient vidí svou výkonnost sám.",
          "Agenty, kteří upozorňují místo aby čekali na dotaz.",
        ],
      },
      {
        typ: "text",
        obsah:
          "Nic z toho není hotové. Ale všechno z toho je postavené na základu, " +
          "který drží — a to je ta část, která se dělá nejhůř a je nejvíc vidět, " +
          "když chybí.",
      },
    ],
  },
];
