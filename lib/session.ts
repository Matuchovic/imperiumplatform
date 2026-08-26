import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "bi_session";

/**
 * Klíč se čte líně, až při prvním použití — ne na úrovni modulu.
 * Díky tomu build projde i bez nastavené proměnné, ale běžící produkce
 * odmítne pracovat na známém vývojovém klíči. Kdyby tam fallback zůstal,
 * dokázal by si platnou session podepsat kdokoliv, kdo viděl repozitář.
 */
let cached: Uint8Array | null = null;

function secret(): Uint8Array {
  if (cached) return cached;

  const raw = process.env.AUTH_SECRET;

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Chybí AUTH_SECRET. Nastav ho ve Vercel → Settings → Environment Variables. " +
          "Bez něj by šlo session podepsat cizím klíčem."
      );
    }
    cached = new TextEncoder().encode(
      "vyvojovy-klic-nepouzivat-v-produkci-min-32-znaku"
    );
    return cached;
  }

  if (raw.length < 32) {
    throw new Error("AUTH_SECRET musí mít aspoň 32 znaků.");
  }

  cached = new TextEncoder().encode(raw);
  return cached;
}

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  plan: string;
};

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
