/**
 * Konstanty zámku bez jediné závislosti.
 *
 * Odděleno od `zamek.ts` schválně: ten používá node:crypto a je
 * tedy serverový. Kdyby si klientská komponenta brala konstantu
 * odtamtud, stáhla by si do prohlížeče celý šifrovací modul —
 * a build na to spadne.
 */

export const PIN_DELKA = 6;
export const MAX_POKUSU = 5;
export const BLOKACE_MIN = 15;
export const PLATNOST_MIN = 30;

/** PIN musí být přesně šest číslic. Kontrola běží na obou stranách. */
export const platnyPin = (pin: string): boolean =>
  new RegExp(`^\\d{${PIN_DELKA}}$`).test(pin);
