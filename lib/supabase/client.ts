import { createClient } from "@supabase/supabase-js";

/**
 * Klient pro prohlížeč. Anon klíč je veřejný záměrně — co s ním jde
 * přečíst, určují výhradně RLS politiky v databázi. Bez nich by byl
 * veřejný klíč veřejná data.
 */
export function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Chybí veřejné Supabase proměnné.");
  }

  return createClient(url, key);
}
