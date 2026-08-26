import { createBrowserClient } from "@supabase/ssr";

/** Klient pro prohlížeč. Anon klíč je veřejný, chrání ho RLS. */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
