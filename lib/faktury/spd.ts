import { naIban } from "./iban";

/**
 * Řetězec pro QR platbu podle českého standardu SPD 1.0.
 *
 * Klient naskenuje kód v bankovní aplikaci a má předvyplněnou
 * platbu — účet, částku i variabilní symbol. Nemusí nic opisovat,
 * takže platí dřív a bez překlepů.
 */

export type Platba = {
  ucet: string;
  castka: number;
  vs?: string;
  ks?: string;
  ss?: string;
  zprava?: string;
  splatnost?: string | null;
};

/**
 * Text zprávy pro příjemce.
 *
 * SPD nepovoluje hvězdičku — je to oddělovač polí. Diakritika
 * projde, ale banky ji zobrazují nespolehlivě, proto se odstraní.
 */
export function ocistiZpravu(text: string, delka = 60): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, delka);
}

export function spd(p: Platba): string | null {
  const iban = naIban(p.ucet);
  if (!iban) return null;

  const casti = [
    "SPD*1.0",
    `ACC:${iban}`,
    // Částka vždy se dvěma desetinnými místy a tečkou.
    `AM:${p.castka.toFixed(2)}`,
    "CC:CZK",
  ];

  if (p.vs) casti.push(`X-VS:${p.vs.replace(/\D/g, "").slice(0, 10)}`);
  if (p.ks) casti.push(`X-KS:${p.ks.replace(/\D/g, "").slice(0, 4)}`);
  if (p.ss) casti.push(`X-SS:${p.ss.replace(/\D/g, "").slice(0, 10)}`);
  if (p.zprava) casti.push(`MSG:${ocistiZpravu(p.zprava)}`);
  // Datum splatnosti ve tvaru RRRRMMDD.
  if (p.splatnost) casti.push(`DT:${p.splatnost.replace(/-/g, "")}`);

  return casti.join("*");
}
