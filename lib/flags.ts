import { serviceClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

/**
 * Vypínače rizikových podsystémů. Tři booleany v nastavení, ne
 * framework — na tři hodnoty by byl zbytečný.
 *
 * Výchozí stav je vypnuto. Zapíná se vědomě.
 */

export type Flag =
  | "watcher_enabled"
  | "automations_enabled"
  | "settlement_enabled"
  | "ai_agents_enabled"
  | "ai_write_enabled";

const DEFAULTS: Record<Flag, boolean> = {
  watcher_enabled: false,
  automations_enabled: false,
  settlement_enabled: false,
  ai_agents_enabled: false,
  ai_write_enabled: false,
};

export async function flags(): Promise<Record<Flag, boolean>> {
  try {
    const db = serviceClient();
    const { data, error } = await db
      .from("app_settings")
      .select("watcher_enabled, automations_enabled, settlement_enabled, ai_agents_enabled, ai_write_enabled")
      .eq("id", true)
      .single();

    if (error) throw error;
    return { ...DEFAULTS, ...(data as Partial<Record<Flag, boolean>>) };
  } catch (err) {
    // Když se nastavení nepodaří přečíst, platí vypnuto. Nejistota
    // nesmí vést k tomu, že se něco rizikového rozběhne.
    log("warn", "flags", "nastavení nedostupné, platí výchozí vypnuto", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ...DEFAULTS };
  }
}

export async function isEnabled(flag: Flag): Promise<boolean> {
  return (await flags())[flag];
}
