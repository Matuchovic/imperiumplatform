/**
 * Verze aplikace.
 *
 * VERZE je pro člověka — ukazuje se v liště a v patičce. Zvedej ji,
 * když se změní něco, o čem má smysl dát vědět.
 *
 * O tom, JESTLI lišta naskočí, ale rozhoduje `buildId` — hash commitu
 * z Vercelu. Ten se mění při každém nasazení sám, takže se na lištu
 * nedá zapomenout. Původní řešení záviselo na tom, že si někdo
 * vzpomene zvednout konstantu, a dvakrát za sebou se to nestalo.
 */
export const VERZE = "1.36.1";

/** Jedna věta o tom, co se změnilo. „Nová verze" nikoho nepřesvědčí. */
export const VERZE_POPIS = "Asistent mluví přes ElevenLabs, výběr hlasu v aplikaci.";

/**
 * Důležitá oprava se nedá odložit.
 *
 * Nastavit na true jedině tehdy, když stará verze počítá špatně nebo
 * ukazuje neplatná data. Když bude důležité všechno, přestane to
 * znamenat cokoliv.
 */
export const VERZE_DULEZITA = false;

/**
 * Otisk nasazení. Vercel dodá hash commitu, lokálně zůstane "dev" —
 * při vývoji tedy lišta neotravuje.
 */
export const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
