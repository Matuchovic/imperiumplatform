/**
 * Oddělení se odvozuje z role, nevyplňuje se zvlášť.
 *
 * Ruční pole by znamenalo práci dvakrát a riziko, že si to začne
 * odporovat — role říká „účetní", oddělení „obchod". Odvození
 * navíc funguje zpětně na lidi, kteří už v systému jsou.
 *
 * Modul je bez závislostí, takže ho smí vzít i prohlížeč.
 */

export type Oddeleni = "vedeni" | "obchod" | "provoz";

export const ODDELENI: {
  klic: Oddeleni;
  nazev: string;
  popis: string;
  ikona: string;
}[] = [
  { klic: "vedeni", nazev: "Vedení", popis: "Řízení a vývoj", ikona: "crown" },
  { klic: "obchod", nazev: "Obchod", popis: "Klienti a kampaně", ikona: "briefcase" },
  { klic: "provoz", nazev: "Provoz", popis: "Data a účetnictví", ikona: "settings" },
];

const MAPA: Record<string, Oddeleni> = {
  ceo: "vedeni",
  vyvojar: "vedeni",
  manazer: "obchod",
  marketing: "obchod",
  scout: "provoz",
  ucetni: "provoz",
};

export const oddeleniZRole = (role: string): Oddeleni => MAPA[role] ?? "provoz";

export const UVAZKY: Record<string, string> = {
  hpp: "Hlavní poměr",
  dpp: "Dohoda o provedení práce",
  dpc: "Dohoda o pracovní činnosti",
  osvc: "Fakturace (OSVČ)",
  spolecnik: "Společník",
};

/** Jak dlouho je člověk ve firmě. Roky a měsíce, ne jen dny. */
export function delkaPusobeni(nastup: string | null, ukonceni: string | null = null): string {
  if (!nastup) return "—";

  const od = new Date(nastup);
  const do_ = ukonceni ? new Date(ukonceni) : new Date();
  const mesicu = Math.max(0,
    (do_.getFullYear() - od.getFullYear()) * 12 + (do_.getMonth() - od.getMonth())
  );

  if (mesicu < 1) return "méně než měsíc";
  if (mesicu < 12) return `${mesicu} ${mesicu === 1 ? "měsíc" : mesicu < 5 ? "měsíce" : "měsíců"}`;

  const roky = Math.floor(mesicu / 12);
  const zbytek = mesicu % 12;
  const rokyText = `${roky} ${roky === 1 ? "rok" : roky < 5 ? "roky" : "let"}`;
  return zbytek === 0 ? rokyText : `${rokyText} a ${zbytek} měs.`;
}

/** Výročí nástupu do měsíce dopředu. Připomínka, ne oslava zpětně. */
export function blizeSeVyroci(nastup: string | null, dni = 30): number | null {
  if (!nastup) return null;

  const od = new Date(nastup);
  const dnes = new Date();
  const letos = new Date(dnes.getFullYear(), od.getMonth(), od.getDate());
  // Když už letos bylo, počítá se to příští.
  const cil = letos < dnes ? new Date(dnes.getFullYear() + 1, od.getMonth(), od.getDate()) : letos;

  const zbyva = Math.round((cil.getTime() - dnes.getTime()) / 864e5);
  return zbyva <= dni ? zbyva : null;
}
