/**
 * Kalendář jmenin.
 *
 * Data místo volání cizí služby — je to 366 řádků, které se nemění,
 * a závislost na cizím serveru kvůli jménu dne je zbytečná.
 */

const JMENINY: Record<number, string[]> = {
  1: ["Nový rok", "Karina", "Radmila", "Diana", "Dalimil", "Tři králové", "Vilma", "Čestmír", "Vladan", "Břetislav", "Bohdana", "Pravoslav", "Edita", "Radovan", "Alice", "Ctirad", "Drahoslav", "Vladislav", "Doubravka", "Ilona", "Běla", "Slavomír", "Zdeněk", "Milena", "Miloš", "Zora", "Ingrid", "Otýlie", "Zdislava", "Robin", "Marika"],
  2: ["Hynek", "Nela", "Blažej", "Jarmila", "Dobromila", "Vanda", "Veronika", "Milada", "Apolena", "Mojmír", "Božena", "Slavěna", "Věnceslav", "Valentýn", "Jiřina", "Ljuba", "Miloslava", "Gizela", "Patrik", "Oldřich", "Lenka", "Petr", "Svatopluk", "Matěj", "Liliana", "Dorota", "Alexandr", "Lumír", "Horymír"],
  3: ["Bedřich", "Anežka", "Kamil", "Stela", "Kazimír", "Miroslav", "Tomáš", "Gabriela", "Františka", "Viktorie", "Anděla", "Řehoř", "Růžena", "Rút a Matylda", "Ida", "Elena a Herbert", "Vlastimil", "Eduard", "Josef", "Světlana", "Radek", "Leona", "Ivona", "Gabriel", "Marián", "Emanuel", "Dita", "Soňa", "Taťána", "Arnošt", "Kvido"],
  4: ["Hugo", "Erika", "Richard", "Ivana", "Miroslava", "Vendula", "Heřman a Hermína", "Ema", "Dušan", "Darja", "Izabela", "Julius", "Aleš", "Vincenc", "Anastázie", "Irena", "Rudolf", "Valérie", "Rostislav", "Marcela", "Alexandra", "Evženie", "Vojtěch", "Jiří", "Marek", "Oto", "Jaroslav", "Vlastislav", "Robert", "Blahoslav"],
  5: ["Svátek práce", "Zikmund", "Alexej", "Květoslav", "Klaudie", "Radoslav", "Stanislav", "Den vítězství", "Ctibor", "Blažena", "Svatava", "Pankrác", "Servác", "Bonifác", "Žofie", "Přemysl", "Aneta", "Nataša", "Ivo", "Zbyšek", "Monika", "Emil", "Vladimír", "Jana", "Viola", "Filip", "Valdemar", "Vilém", "Maxmilián", "Ferdinand", "Kamila"],
  6: ["Laura", "Jarmil", "Tamara", "Dalibor", "Dobroslav", "Norbert", "Iveta a Slavoj", "Medard", "Stanislava", "Gita", "Bruno", "Antonie", "Antonín", "Roland", "Vít", "Zbyněk", "Adolf", "Milan", "Leoš", "Květa", "Alois", "Pavla", "Zdeňka", "Jan", "Ivan", "Adriana", "Ladislav", "Lubomír", "Petr a Pavel", "Šárka"],
  7: ["Jaroslava", "Patricie", "Radomír", "Prokop", "Cyril a Metoděj", "Jan Hus", "Bohuslava", "Nora", "Drahoslava", "Libuše a Amálie", "Olga", "Bořek", "Markéta", "Karolína", "Jindřich", "Luboš", "Martina", "Drahomíra", "Čeněk", "Ilja", "Vítězslav", "Magdaléna", "Libor", "Kristýna", "Jakub", "Anna", "Věroslav", "Viktor", "Marta", "Bořivoj", "Ignác"],
  8: ["Oskar", "Gustav", "Miluše", "Dominik", "Kristián", "Oldřiška", "Lada", "Soběslav", "Roman", "Vavřinec", "Zuzana", "Klára", "Alena", "Alan", "Hana", "Jáchym", "Petra", "Helena", "Ludvík", "Bernard", "Johana", "Bohuslav", "Sandra", "Bartoloměj", "Radim", "Luděk", "Otakar", "Augustýn", "Evelína", "Vladěna", "Pavlína"],
  9: ["Linda a Samuel", "Adéla", "Bronislav", "Jindřiška", "Boris", "Boleslav", "Regína", "Mariana", "Daniela", "Irma", "Denisa", "Marie", "Lubor", "Radka", "Jolana", "Ludmila", "Naděžda", "Kryštof", "Zita", "Oleg", "Matouš", "Darina", "Berta", "Jaromír", "Zlata", "Andrea", "Jonáš", "Václav", "Michal", "Jeroným"],
  10: ["Igor", "Olívie a Oliver", "Bohumil", "František", "Eliška", "Hanuš", "Justýna", "Věra", "Štefan a Sára", "Marina", "Andrej", "Marcel", "Renáta", "Agáta", "Tereza", "Havel", "Hedvika", "Lukáš", "Michaela", "Vendelín", "Brigita", "Sabina", "Teodor", "Nina", "Beáta", "Erik", "Šarlota a Zoe", "Den vzniku ČSR", "Silvie", "Tadeáš", "Štěpánka"],
  11: ["Felix", "Památka zesnulých", "Hubert", "Karel", "Miriam", "Liběna", "Saskie", "Bohumír", "Bohdan", "Evžen", "Martin", "Benedikt", "Tibor", "Sáva", "Leopold", "Otmar", "Mahulena", "Romana", "Alžběta", "Nikola", "Albert", "Cecílie", "Klement", "Emílie", "Kateřina", "Artur", "Xenie", "René", "Zina", "Ondřej"],
  12: ["Iva", "Blanka", "Svatoslav", "Barbora", "Jitka", "Mikuláš", "Ambrož a Benjamin", "Květoslava", "Vratislav", "Julie", "Dana", "Simona", "Lucie", "Lýdie", "Radana a Radan", "Albína", "Daniel", "Miloslav", "Ester", "Dagmar", "Natálie", "Šimon", "Vlasta", "Adam a Eva", "1. svátek vánoční", "Štěpán", "Žaneta", "Bohumila", "Judita", "David", "Silvestr"],
};

/** Kdo má dnes svátek. Prázdný řetězec u dat, která jméno nemají. */
export function jmeninyDne(d = new Date()): string {
  return JMENINY[d.getMonth() + 1]?.[d.getDate() - 1] ?? "";
}

/** Jmeniny na daný den v měsíci. */
export function jmeninyNa(mesic: number, den: number): string {
  return JMENINY[mesic]?.[den - 1] ?? "";
}

/**
 * Nejbližší jmeniny lidí ze seznamu.
 *
 * Porovnává se křestní jméno, ne celé — v kalendáři je „Petr",
 * ne „Petr Svoboda". Diakritika se srovnává, aby „Tomas" našel
 * „Tomáš".
 */
export function nejblizsiSvatky(
  jmena: { id: string; jmeno: string }[],
  dopredu = 14,
  dnes = new Date()
): { id: string; jmeno: string; datum: string; zaDni: number }[] {
  const vysledek: { id: string; jmeno: string; datum: string; zaDni: number }[] = [];

  for (let i = 0; i <= dopredu; i++) {
    const d = new Date(dnes);
    d.setDate(d.getDate() + i);
    const jm = jmeninyNa(d.getMonth() + 1, d.getDate());
    if (!jm) continue;

    // Datum může mít víc jmen: „Ivo a Milan".
    const dnesniJmena = jm.split(/\s+a\s+/).map(bezDiakritiky);

    for (const c of jmena) {
      const krestni = bezDiakritiky(c.jmeno.trim().split(/\s+/)[0] ?? "");
      if (krestni && dnesniJmena.includes(krestni)) {
        vysledek.push({
          id: c.id,
          jmeno: c.jmeno,
          datum: `${d.getDate()}. ${d.getMonth() + 1}.`,
          zaDni: i,
        });
      }
    }
  }

  return vysledek;
}

const bezDiakritiky = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
