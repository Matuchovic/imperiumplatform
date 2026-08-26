import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Klient přihlášeného uživatele. Session drží cookies, práva určuje RLS. */
export async function supabaseServer() {
  const store = await cookies();

  return createServerClient(URL(), ANON(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // V server komponentě zapisovat nejde — obnovu řeší middleware.
        }
      },
    },
  });
}

/**
 * Klient s právy service_role. Obchází RLS, běží jen na serveru
 * a používá ho motor, ne uživatelské stránky.
 */
export function serviceClient() {
  if (typeof window !== "undefined") {
    throw new Error("serviceClient() nesmí běžet v prohlížeči.");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL() || !key) throw new Error("Chybí Supabase proměnné pro service_role.");

  return createClient(URL(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
