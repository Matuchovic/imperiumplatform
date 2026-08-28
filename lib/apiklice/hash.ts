import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import type { Druh } from "./klice";

/**
 * Vytváření a ověřování klíčů. Server only.
 *
 * Do databáze jde jen otisk, nikdy klíč sám. Kdo se dostane
 * k databázi, nedostane se k API.
 */

/** 32 bajtů náhody. Uhodnout to nejde ani hrubou silou. */
export function novyKlic(druh: Druh): string {
  return `bi_${druh}_${randomBytes(32).toString("base64url")}`;
}

/**
 * Otisk klíče.
 *
 * SHA-256 bez soli schválně — klíč má 256 bitů náhody, takže
 * předpočítaná tabulka nedává smysl. Sůl by naopak znemožnila
 * vyhledat klíč v databázi podle otisku.
 */
export const otiskKlice = (klic: string): string =>
  createHash("sha256").update(klic).digest("hex");

/**
 * Porovnání v konstantním čase.
 *
 * Běžné === skončí na prvním rozdílném znaku a doba odpovědi
 * prozradí, kolik znaků sedělo.
 */
export function otiskSedi(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}
