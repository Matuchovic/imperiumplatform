/**
 * Slovník pojmů.
 *
 * Jedno místo pro celou aplikaci — kdyby se vysvětlení psala
 * u každého výskytu zvlášť, časem by se rozešla a tentýž pojem
 * by jinde znamenal něco jiného.
 */

export const POJMY: Record<string, string> = {
  clv:
    "Closing Line Value — rozdíl mezi kurzem, za který jste vsadili, a kurzem těsně před výkopem. " +
    "Kladné číslo znamená, že jste trh předběhli.",
  roi:
    "Podíl zisku k celkové vsazené částce. Při malém počtu tiketů kolísá natolik, " +
    "že se z něj nedá nic vyčíst.",
  pasmo:
    "Rozsah kurzů se stejným chováním. Nižší kurzy vycházejí častěji, ale nesou menší zisk — a naopak.",
  bankroll:
    "Peníze vyhrazené na sázení. Velikost sázky se počítá z něj, ne z toho, co má klient na účtu.",
  jednotka:
    "Základní velikost sázky, obvykle procento bankrollu. Systém doporučuje, kolik jednotek vsadit.",
  drawdown:
    "Největší propad od dosavadního vrcholu. Říká, co klient musel psychicky ustát, " +
    "ne jak dopadl nakonec.",
  kelly:
    "Vzorec, který určuje velikost sázky tak, aby bankroll rostl co nejrychleji a nespadl na nulu. " +
    "Systém používá jen jeho čtvrtinu.",
  interval:
    "Rozsah, ve kterém se skutečná hodnota nejspíš pohybuje. Když zahrnuje nulu, " +
    "zisk zatím nejde odlišit od náhody.",
  vzorek:
    "Počet vyhodnocených tiketů. Pod několika stovkami jsou výsledky spíš náhoda než výkonnost.",
  kandidat:
    "Příležitost, kterou motor našel a která čeká na schválení člověkem. Sama se nikdy neodešle.",
  vapid:
    "Dvojice klíčů, kterou se podepisují push notifikace. Po jejich změně přestanou " +
    "staré odběry fungovat.",
  rls:
    "Row Level Security — pravidla v databázi, která určují, kdo smí vidět který řádek. " +
    "Platí i při přímém dotazu, ne jen v aplikaci.",
};

export type Pojem = keyof typeof POJMY;
