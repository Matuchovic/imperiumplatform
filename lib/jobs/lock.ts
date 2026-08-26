import { serviceClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { DEFAULT_LEASE_MINUTES } from "./lease";

/**
 * Zámek úlohy přes databázi.
 *
 * Převzetí je atomické na straně PostgreSQL — kdyby se rozhodovalo
 * v TypeScriptu, dva souběžné běhy by si zámek přiřkly oba.
 */

export async function withLock<T>(
  jobKey: string,
  holder: string,
  fn: () => Promise<T>,
  minutes = DEFAULT_LEASE_MINUTES
): Promise<T | null> {
  const db = serviceClient();

  const { data: got, error } = await db.rpc("acquire_job_lock", {
    p_job_key: jobKey,
    p_holder: holder,
    p_minutes: minutes,
  });

  if (error) {
    log("error", "jobs", "získání zámku selhalo", { jobKey, error: error.message });
    return null;
  }
  if (!got) {
    log("info", "jobs", "úloha už běží, tenhle běh se přeskakuje", { jobKey, holder });
    return null;
  }

  try {
    return await fn();
  } finally {
    // Uvolnění i při chybě — jinak by úloha čekala na vypršení.
    await db.rpc("release_job_lock", { p_job_key: jobKey, p_holder: holder });
  }
}
