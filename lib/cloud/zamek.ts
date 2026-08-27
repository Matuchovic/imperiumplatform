import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * PIN zámek Cloudu.
 *
 * PIN se ukládá jako scrypt otisk se solí — z databáze se zpětně
 * nezíská. Porovnání běží v konstantním čase, takže z doby odpovědi
 * nejde poznat, kolik znaků sedělo.
 */

import { PIN_DELKA, MAX_POKUSU, BLOKACE_MIN, platnyPin } from "./zamek-verejne";

export { PIN_DELKA, MAX_POKUSU, BLOKACE_MIN, platnyPin };

export function otiskni(pin: string): string {
  const sul = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, sul, 32).toString("hex");
  return `${sul}:${hash}`;
}

export function sedi(pin: string, otisk: string): boolean {
  const [sul, hash] = otisk.split(":");
  if (!sul || !hash) return false;

  try {
    const a = Buffer.from(hash, "hex");
    const b = scryptSync(pin, sul, 32);
    // Konstantní čas — z délky odpovědi nejde nic vyčíst.
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Kolik pokusů zbývá a jestli je brána zamčená. */
export function stavPokusu(pokusy: number, blokovanoDo: string | null) {
  const blokovano = blokovanoDo ? new Date(blokovanoDo).getTime() > Date.now() : false;
  return {
    blokovano,
    zbyva: Math.max(0, MAX_POKUSU - pokusy),
    doKdy: blokovano ? blokovanoDo : null,
  };
}

export function dalsiBlokace(pokusy: number): string | null {
  return pokusy + 1 >= MAX_POKUSU
    ? new Date(Date.now() + BLOKACE_MIN * 60_000).toISOString()
    : null;
}
