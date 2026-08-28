/**
 * Kontrola IP adres.
 *
 * Doména se dá podvrhnout — prohlížeč hlavičku nastavuje sám,
 * ale server volající přes curl si tam napíše cokoli. Adresa
 * se podvrhnout nedá, proto je to silnější pojistka.
 *
 * Bez závislostí, aby to šlo otestovat.
 */

/** Adresa z hlavičky proxy. První v řetězci je ta skutečná. */
export function adresaZadatele(hlavicky: Headers): string | null {
  const dopredu = hlavicky.get("x-forwarded-for");
  if (dopredu) {
    const prvni = dopredu.split(",")[0]?.trim();
    if (prvni) return prvni;
  }
  return hlavicky.get("x-real-ip")?.trim() || null;
}

/** Rozpad IPv4 na číslo. Vrací null u čehokoli, co není adresa. */
function naCislo(ip: string): number | null {
  const casti = ip.trim().split(".");
  if (casti.length !== 4) return null;

  let v = 0;
  for (const c of casti) {
    if (!/^\d{1,3}$/.test(c)) return null;
    const n = Number(c);
    if (n > 255) return null;
    v = v * 256 + n;
  }
  return v >>> 0;
}

/**
 * Sedí adresa na vzor?
 *
 * Podporuje přesnou adresu a rozsah zápisem s lomítkem.
 * IPv6 se porovnává jen přesně — rozsahy tam přinášejí
 * víc chyb než užitku.
 */
export function ipSedi(vzor: string, ip: string): boolean {
  const v = vzor.trim();
  if (!v) return false;

  // IPv6 nebo cokoli s dvojtečkou — jen přesná shoda.
  if (v.includes(":") || ip.includes(":")) {
    return v.toLowerCase() === ip.trim().toLowerCase();
  }

  if (!v.includes("/")) return v === ip.trim();

  const [zaklad, bitu] = v.split("/");
  const b = Number(bitu);
  if (!Number.isInteger(b) || b < 0 || b > 32) return false;

  const a = naCislo(zaklad);
  const c = naCislo(ip);
  if (a === null || c === null) return false;

  // Nulový prefix znamená všechno; posun o 32 je v JS nedefinovaný.
  if (b === 0) return true;
  const maska = (0xffffffff << (32 - b)) >>> 0;
  return (a & maska) === (c & maska);
}

/**
 * Prochází adresa seznamem?
 *
 * Prázdný seznam znamená bez omezení — rozhraní na to upozorní
 * u klíčů se zápisem.
 */
export function ipProchazi(seznam: string[], ip: string | null): boolean {
  if (seznam.length === 0) return true;
  if (!ip) return false;
  return seznam.some((v) => ipSedi(v, ip));
}
