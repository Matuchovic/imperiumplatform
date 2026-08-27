/**
 * Obsah sekce Vize.
 *
 * Text je v datech, ne v komponentě — dá se doplňovat bez zásahu
 * do rozhraní a jeden překlep neshodí stránku.
 */

export type Blok =
  | { typ: "text"; obsah: string }
  | { typ: "nadpis"; obsah: string }
  | { typ: "seznam"; polozky: string[] }
  | { typ: "kroky"; polozky: string[] }
  | { typ: "zvyrazneni"; obsah: string }
  | { typ: "varovani"; obsah: string }
  | { typ: "cisla"; polozky: { cislo: string; popis: string }[] };

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
    nazev: "Proč to vzniklo",
    perex: "Firmu nedrží pohromadě tipy, ale to, co je kolem nich.",
    ikona: "compass",
    bloky: [
      {
        typ: "text",
        obsah:
          "BETIMPERIUM není sázková aplikace. Je to systém, ve kterém běží firma, " +
          "jejímž předmětem je sázkové poradenství — a to je zásadní rozdíl.",
      },
      {
        typ: "text",
        obsah:
          "Poradenská firma nestojí na tom, že najde dobrý tip. Stojí na tom, že " +
          "o každém klientovi ví, jak si vede, kolik má na účtu a kdy naposledy " +
          "dostal odpověď. Že se nezapomene na fakturu, na termín ani na to, " +
          "co se komu slíbilo.",
      },
      {
        typ: "zvyrazneni",
        obsah:
          "Tip je jeden okamžik. Vztah s klientem je dva roky práce, kterou nikdo nevidí.",
      },
      { typ: "nadpis", obsah: "Co se dělo předtím" },
      {
        typ: "text",
        obsah:
          "Klienti v tabulce. Platby v e-mailu. Domluvy v chatu. Faktury v účetním " +
          "programu, ke kterému má přístup jeden člověk. Výsledky v hlavě.",
      },
      {
        typ: "text",
        obsah:
          "Každá z těch věcí zvlášť funguje. Dohromady tvoří systém, kde nikdo " +
          "neví, jak si firma stojí, dokud si někdo nesedne a hodinu to nesečte. " +
          "A když ten člověk onemocní, nesečte to nikdo.",
      },
      { typ: "nadpis", obsah: "K čemu to má sloužit" },
      {
        typ: "seznam",
        polozky: [
          "Vědět ráno za dvě minuty, co vyžaduje zásah dnes.",
          "Mít o každém klientovi jedno místo, ne pět.",
          "Nezapomenout na to, co se slíbilo — protože si to systém pamatuje.",
          "Poznat, jestli firma roste, dřív než z bankovního výpisu.",
        ],
      },
    ],
  },
  {
    id: "co-to-je",
    nazev: "Co to je a co ne",
    perex: "Hranice, které se nemají překročit.",
    ikona: "layout-grid",
    bloky: [
      {
        typ: "text",
        obsah:
          "Systém má přes dvacet sekcí. Většina z nich nemá se sázením nic společného " +
          "— jsou to nástroje, které potřebuje jakákoli firma o šesti lidech.",
      },
      {
        typ: "cisla",
        polozky: [
          { cislo: "evidence", popis: "klienti, kontakty, personál, vozidla" },
          { cislo: "provoz", popis: "úkoly, support, chat, pošta, cloud" },
          { cislo: "peníze", popis: "faktury, výplaty, bankroll" },
          { cislo: "poradenství", popis: "motor hodnoty, analytika, tikety" },
        ],
      },
      {
        typ: "text",
        obsah:
          "Sázková část je jeden modul z mnoha. Kdyby se firma zítra rozhodla dělat " +
          "něco jiného, zůstane použitelných osmdesát procent systému.",
      },
      { typ: "nadpis", obsah: "Co systém dělat nebude" },
      {
        typ: "text",
        obsah:
          "Tohle jsou rozhodnutí, ne opomenutí. Každé z nich má důvod a nemá se " +
          "měnit jen proto, že by to bylo pohodlné.",
      },
      {
        typ: "seznam",
        polozky: [
          "Nesází za klienta a nikdy sázet nebude. Doporučení není příkaz.",
          "Nepřevádí peníze sám. Vytvoří odkaz k platbě, potvrzuje člověk.",
          "Nepočítá daně ani odvody. To je práce účetní a chyba by stála firmu peníze.",
          "Neslibuje zisk. Sázení je riziko a systém to říká na každé obrazovce, kde to má smysl.",
        ],
      },
      {
        typ: "varovani",
        obsah:
          "Sázkové poradenství je regulovaná činnost. Systém pomáhá dodržovat pravidla " +
          "— auditní stopa, souhlasy s marketingem, ochrana hráčů — ale odpovědnost " +
          "za jejich dodržení nese firma, ne software.",
      },
    ],
  },
  {
    id: "evidence",
    nazev: "Evidence a management",
    perex: "Základ, na kterém stojí všechno ostatní.",
    ikona: "clipboard-data",
    bloky: [
      {
        typ: "text",
        obsah:
          "Evidence zní nudně, ale je to jediná část systému, bez které nic dalšího " +
          "nedává smysl. AI nemá co analyzovat, marketing nemá koho oslovit " +
          "a management nemá co řídit.",
      },
      { typ: "nadpis", obsah: "Jedna pravda o jedné věci" },
      {
        typ: "text",
        obsah:
          "Nejdůležitější pravidlo celého systému: každý údaj má právě jedno místo, " +
          "kde žije. Klient je v profilu, ne zvlášť v personálu a zvlášť v účetnictví. " +
          "Příloha ve zprávě je odkaz do cloudu, ne druhá kopie souboru. Oddělení " +
          "se odvozuje z role, nevyplňuje se zvlášť.",
      },
      {
        typ: "zvyrazneni",
        obsah:
          "Dva zdroje pravdy o téže věci se vždycky jednou rozejdou. Otázka je jen kdy.",
      },
      { typ: "nadpis", obsah: "Co se sleduje" },
      {
        typ: "seznam",
        polozky: [
          "U klienta: bankroll, výkonnost, plán, kdy naposledy něco dostal.",
          "U týmu: kdo co smí, kdo co udělal, kdy nastoupil.",
          "U peněz: co je vystavené, co zaplacené, co po splatnosti.",
          "U systému: každá riziková operace v auditní stopě, kterou nelze přepsat.",
        ],
      },
    ],
  },
  {
    id: "marketing",
    nazev: "Marketing",
    perex: "Získat klienta je drahé. Udržet ho je levnější.",
    ikona: "speakerphone",
    bloky: [
      {
        typ: "text",
        obsah:
          "Databáze kontaktů, kampaně, souhlasy. Zní to jako běžný marketingový " +
          "nástroj, ale v poradenství platí něco, co jinde ne.",
      },
      { typ: "nadpis", obsah: "Retence je důležitější než akvizice" },
      {
        typ: "text",
        obsah:
          "Ze simulace vyšlo, že v prvních pětačtyřiceti dnech je pod nulou " +
          "čtyřicet tři procent klientů — proti jedenatřiceti u dlouhodobých. " +
          "Nováček nemá naspořený polštář a odchází první.",
      },
      {
        typ: "text",
        obsah:
          "Z toho plyne, že nejlepší marketingová investice není další kampaň, " +
          "ale telefonát klientovi, který je tři týdny v propadu. Systém ho " +
          "má najít dřív, než odejde.",
      },
      { typ: "nadpis", obsah: "Souhlas není formalita" },
      {
        typ: "text",
        obsah:
          "Rozesílka bez souhlasu je porušení zákona 480/2004 a pokuta jde " +
          "do statisíců. Systém proto kampaň nespustí nikomu, kdo souhlas nedal, " +
          "a odhlášení platí okamžitě napříč všemi kanály.",
      },
      {
        typ: "varovani",
        obsah:
          "V databázi kontaktů je u každého záznamu účel: interní evidence, " +
          "obchodní kontakt, nebo povolené oslovení. Bez toho posledního " +
          "se na kontakt nesmí psát, i když je v systému.",
      },
    ],
  },
  {
    id: "ai",
    nazev: "AI a agenti",
    perex: "Od odpovídání k dělání.",
    ikona: "sparkles",
    bloky: [
      {
        typ: "text",
        obsah:
          "Asistent v systému dnes umí šestadvacet nástrojů ve čtyřech režimech. " +
          "Umí číst data, hledat na webu, zakládat úkoly a navrhovat akce ke schválení.",
      },
      { typ: "nadpis", obsah: "Proč čtyři režimy, ne jeden" },
      {
        typ: "text",
        obsah:
          "Rozdíl mezi „řekni mi, jak si vede Procházka" a „sniž Procházkovi jednotku" " +
          "není v obtížnosti, ale v následcích. První se dá vzít zpět, druhé ne.",
      },
      {
        typ: "kroky",
        polozky: [
          "Ask — jen čte. Nemůže nic změnit.",
          "Search — čte a hledá na webu. Pořád nic nemění.",
          "Build — zakládá úkoly, poznámky, reporty. Vratné věci.",
          "Operate — navrhuje rizikové akce, které schvaluje člověk.",
        ],
      },
      {
        typ: "zvyrazneni",
        obsah:
          "Sedm operací nesmí asistent nikdy: bankroll, zúčtování, role, platby, " +
          "mazání auditu, zvýšení sázky, obcházení oprávnění.",
      },
      { typ: "nadpis", obsah: "Kam to míří" },
      {
        typ: "text",
        obsah:
          "Dnešní asistent čeká na dotaz. Agent nečeká — sleduje, co se děje, " +
          "a ozve se sám. To je celý rozdíl a je větší, než se zdá.",
      },
      {
        typ: "seznam",
        polozky: [
          "Ranní shrnutí: co se přes noc změnilo a co vyžaduje rozhodnutí dnes.",
          "Hlídač klientů: upozorní na propad dřív, než klient odejde.",
          "Kontrola před odesláním: než tip odejde, projde ho druhá kontrola.",
          "Příprava podkladů: shrnutí klienta před schůzkou, aniž by o to někdo žádal.",
        ],
      },
      {
        typ: "varovani",
        obsah:
          "Agent, který jedná sám, musí mít pevné hranice. Čím víc toho udělá bez " +
          "dotazu, tím důležitější je, aby seznam zakázaných operací zůstal krátký, " +
          "jasný a nepřekročitelný. Rozšiřovat ho je snadné, zúžit už ne.",
      },
    ],
  },
  {
    id: "kam",
    nazev: "Kam to míří",
    perex: "Tři směry a jedna věc, která se nezmění.",
    ikona: "route",
    bloky: [
      { typ: "nadpis", obsah: "Nejbližší" },
      {
        typ: "seznam",
        polozky: [
          "Rozjet motor hodnoty — dnes najde nula kandidátů, protože má málo nabídek na zápas.",
          "Uzavřít okruh: kandidát → schválení → tiket → vyhodnocení → CLV.",
          "Doplnit uzavírací kurzy, bez nich se CLV nedá počítat.",
        ],
      },
      { typ: "nadpis", obsah: "Střednědobě" },
      {
        typ: "seznam",
        polozky: [
          "Klientský portál — klient vidí svou výkonnost sám, bez ptaní.",
          "Agenti, kteří upozorňují místo aby čekali na dotaz.",
          "Napojení na účetnictví, ať se faktury nepřepisují ručně.",
        ],
      },
      { typ: "nadpis", obsah: "Dál" },
      {
        typ: "text",
        obsah:
          "Systém je postavený tak, že sázková část je oddělitelná. Kdyby se " +
          "ukázalo, že větší hodnota je v tom zbytku — evidence, komunikace, " +
          "peníze, AI — dá se to nabídnout jiné firmě, aniž by se přepisoval základ.",
      },
      { typ: "nadpis", obsah: "Co se nezmění" },
      {
        typ: "zvyrazneni",
        obsah:
          "Systém nikdy nebude tvrdit víc, než ví. Když je vzorek malý, řekne to. " +
          "Když zisk nejde odlišit od náhody, řekne to. Když si není jistý, mlčí " +
          "místo aby hádal.",
      },
      {
        typ: "text",
        obsah:
          "V oboru, kde většina konkurence ukazuje vybraná čísla a slibuje výdělek, " +
          "je poctivost k datům jediná trvalá výhoda. Všechno ostatní se dá zkopírovat.",
      },
    ],
  },
];
