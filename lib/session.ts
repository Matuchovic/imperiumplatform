import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "bi_session";

let cached: Uint8Array | null = null;

/** Je podpisový klíč nastavený a použitelný? Volá se před prací se session. */
export function isConfigured(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const raw = process.env.AUTH_SECRET;
  return Boolean(raw && raw.length >= 32);
}

/**
 * Klíč se čte líně, až při prvním použití — ne na úrovni modulu, aby prošel build.
 * Produkce odmítne běžet na známém vývojovém klíči: kdyby tam fallback zůstal,
 * podepsal by si platnou session kdokoliv, kdo viděl repozitář.
 */
function secret(): Uint8Array {
  if (cached) return cached;

  const raw = process.env.AUTH_SECRET;

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET není nastavený.");
    }
    cached = new TextEncoder().encode("vyvojovy-klic-nepouzivat-v-produkci-min-32-znaku");
    return cached;
  }

  if (raw.length < 32) throw new Error("AUTH_SECRET musí mít aspoň 32 znaků.");

  cached = new TextEncoder().encode(raw);
  return cached;
}

export type SessionPayload = { sub: string; email: string; name: string; plan: string };

export async function createSession(payload: SessionPayload, remember: boolean) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("betimperium")
    .setExpirationTime(remember ? "30d" : "12h")
    .sign(secret());
}

export async function readSession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: "betimperium" });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
