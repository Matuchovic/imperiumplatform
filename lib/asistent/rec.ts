/**
 * Úpravy rozpoznaného textu.
 *
 * Bez závislostí, aby to šlo otestovat bez prohlížeče.
 */

/**
 * Očištění přepisu.
 *
 * Rozpoznávání vrací text bez velkého písmene a s mezerami navíc.
 * Diktované interpunkci taky nerozumí, takže „tečka" na konci
 * znamená tečku, ne slovo.
 */
export function ocistiPrepis(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";

  /**
   * Diktovaná interpunkce.
   *
   * Hranice slova \b nezná české znaky — u „čárka" by se rozešla
   * na „č" a zbytek. Proto se hranice píše přes mezery ručně.
   */
  t = t
    .replace(/(^|\s)tečka\s*$/i, ".")
    .replace(/(^|\s)otazník\s*$/i, "?")
    .replace(/(^|\s)vykřičník\s*$/i, "!")
    .replace(/(^|\s)čárka(\s|$)/gi, ", ");

  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t.replace(/\s+([,.?!])/g, "$1").replace(/\s+/g, " ").trim();
}

/**
 * Má smysl to odeslat?
 *
 * Rozpoznávání někdy zachytí šum jako jedno krátké slovo.
 * Poslat asistentovi „ehm" znamená čekat na odpověď na nic.
 */
export function jeSmysluplne(text: string): boolean {
  const t = text.trim();
  if (t.length < 3) return false;

  const slova = t.split(/\s+/).filter((s) => s.length > 1);
  if (slova.length === 0) return false;

  // Samotné citoslovce nebo potvrzení nedává asistentovi co dělat.
  const sum = /^(ehm|hm+|aha|no|jo|jasně|tak|ok|okej)[.!?]?$/i;
  return !sum.test(t);
}

/** Zkrácení pro zobrazení v průběhu. */
export const nahledPrepisu = (text: string, delka = 120): string =>
  text.length <= delka ? text : "…" + text.slice(-delka);
