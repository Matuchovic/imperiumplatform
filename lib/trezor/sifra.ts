import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

/**
 * Šifrování hodnot v trezoru.
 *
 * Klíč žije v proměnné prostředí, ne v databázi. Únik databáze tak
 * sám o sobě neodhalí ani jedno heslo — bez klíče jsou uložené
 * řetězce nepoužitelné.
 *
 * AES-256-GCM navíc ověřuje neporušenost: když někdo se záznamem
 * v databázi pohne, dešifrování selže místo aby vrátilo nesmysl.
 */

const ALGORITMUS = "aes-256-gcm";

function klic(): Buffer | null {
  const s = process.env.TREZOR_KLIC;
  if (!s || s.length < 32) return null;
  // Z libovolně dlouhého tajemství uděláme přesně 32 bajtů.
  return createHash("sha256").update(s).digest();
}

export const trezorPripraven = () => klic() !== null;

export function zasifruj(text: string): string | null {
  const k = klic();
  if (!k) return null;

  const iv = randomBytes(12);
  const c = createCipheriv(ALGORITMUS, k, iv);
  const data = Buffer.concat([c.update(text, "utf8"), c.final()]);
  const tag = c.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(":");
}

export function desifruj(ulozene: string): string | null {
  const k = klic();
  if (!k) return null;

  const casti = ulozene.split(":");
  if (casti.length !== 3) return null;

  try {
    const [iv, tag, data] = casti.map((x) => Buffer.from(x, "base64"));
    const d = createDecipheriv(ALGORITMUS, k, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString("utf8");
  } catch {
    // Špatný klíč nebo pozměněný záznam. Obojí znamená nevracet nic.
    return null;
  }
}

/** Náhled hesla bez odhalení. „abc…xyz" podle délky. */
export function naznak(delka: number): string {
  return "•".repeat(Math.min(12, Math.max(6, delka)));
}
