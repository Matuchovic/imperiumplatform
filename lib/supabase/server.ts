import { createClient } from "@supabase/supabase-js";

/**
 * Klient s právy service_role. Běží VÝHRADNĚ na serveru — obchází RLS,
 * takže by v prohlížeči znamenal plný přístup k databázi pro kohokoliv.
 * Import z klientské komponenty musí selhat, ne projít potichu.
 */
export function serviceClient() {
  if (typeof window !== "undefined") {
    throw new Error("serviceClient() nesmí běžet v prohlížeči.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
