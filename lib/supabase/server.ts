import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { requirePublicEnv } from "./env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Klient přihlášeného uživatele. Session drží cookies, práva určuje RLS. */
export async function supabaseServer() {
  const { url, anon } = requirePublicEnv();
  const store = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list: CookieToSet[]) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // V server komponentě zapisovat nejde — obnovu řeší middleware.
        }
      },
    },
  });
}

/** Přihlášený uživatel, nebo null. Nikdy nehodí výjimku. */
export async function currentUser() {
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch (err) {
    console.error("[auth] čtení uživatele selhalo:", err);
    return null;
  }
}

/**
 * Klient s právy service_role. Obchází RLS, běží jen na serveru
 * a používá ho motor, ne uživatelské stránky.
 */
export function serviceClient() {
  if (typeof window !== "undefined") {
    throw new Error("serviceClient() nesmí běžet v prohlížeči.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Chybí Supabase proměnné pro service_role.");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
