import { scryptSync, timingSafeEqual } from "crypto";
import { serviceClient } from "@/lib/supabase/server";

export type User = {
  id: string;
  email: string;
  name: string;
  plan: string;
  passwordHash: string;
};

/** Účty se čtou ze Supabase. Bez nastavených klíčů vrací null. */
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const db = serviceClient();
    const { data } = await db
      .from("app_users")
      .select("id, email, name, plan, password_hash")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (!data) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      plan: data.plan,
      passwordHash: data.password_hash,
    };
  } catch (err) {
    console.error("[db] čtení účtu selhalo:", err);
    return null;
  }
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
