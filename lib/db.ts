import { scryptSync, timingSafeEqual } from "crypto";

/**
 * Demo úložiště. Při napojení na skutečnou DB (Postgres + Prisma / Drizzle)
 * nahraď jen tělo findUserByEmail — zbytek aplikace zůstane beze změny.
 */
export type User = {
  id: string;
  email: string;
  name: string;
  plan: "start" | "pro" | "elite";
  passwordHash: string; // formát: salt:hash (scrypt)
};

const USERS: User[] = [
  {
    id: "usr_001",
    email: "demo@bet-imperium.cz",
    name: "Demo Uživatel",
    plan: "pro",
    passwordHash:
      "62e3137d4d55b8c774115eb40fad7e69:167795e4fa3286f7da5a465660695925de357d3b20bb9f7565f6ada3dd45adfe882ef554f06c18e691eaa37df5579a6d791cd3e2dcb779d1f1d39d12e3c9620e",
  },
];

export function findUserByEmail(email: string): User | undefined {
  return USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
