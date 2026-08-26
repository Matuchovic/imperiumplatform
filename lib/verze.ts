/**
 * Verze aplikace.
 *
 * Zvednout při každém nasazení. Podle ní pozná běžící aplikace, že
 * vyšla novější — viz `AktualizaceVerze`. Bez zvednutí se lišta
 * s nabídkou obnovení neobjeví.
 */
export const VERZE = "2.5.0";

/**
 * Jedna věta o tom, co se změnilo. „Nová verze" nikoho nepřesvědčí,
 * aby přerušil práci — konkrétní důvod ano.
 */
export const VERZE_POPIS = "Lišta upozorňuje na novou verzi a nabídne obnovení.";

/**
 * Důležitá oprava se nedá odložit.
 *
 * Nastavit na true jedině tehdy, když stará verze počítá špatně nebo
 * ukazuje neplatná data. Když bude důležité všechno, přestane to
 * znamenat cokoliv a lidé se naučí lištu odklikávat.
 */
export const VERZE_DULEZITA = false;
