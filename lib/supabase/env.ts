/**
 * Čtení proměnných na jednom místě. Dřív tu bylo `process.env.X!`,
 * což TypeScriptu tvrdí "tohle tam je" a za běhu se rozpadne
 * na nesrozumitelné výjimce uvnitř knihovny.
 *
 * NEXT_PUBLIC_* se vkládají do balíčku při buildu. Musí být nastavené
 * PŘED buildem — přidat je a nezredeployovat nestačí.
 */
export type SupabaseEnv = { url: string; anon: string };

export function readPublicEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return { url, anon };
}

export function requirePublicEnv(): SupabaseEnv {
  const env = readPublicEnv();
  if (!env) {
    throw new Error(
      "Chybí NEXT_PUBLIC_SUPABASE_URL nebo NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Nastav je ve Vercelu a spusť nový deploy — tyhle proměnné se vkládají při buildu."
    );
  }
  return env;
}
