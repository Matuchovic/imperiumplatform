import { poskytovatel, NENASTAVENO } from "./provider";
import type { Dotaz, Nalez } from "./typy";
import { log } from "@/lib/log";

/**
 * Hledání na webu s krátkou mezipamětí.
 *
 * Stejný dotaz do minuty se neopakuje — u sportu je čas citlivý,
 * takže platnost je krátká, ale opakované kliknutí nemá volat
 * poskytovatele znovu.
 */

type Zaznam = { nalezy: Nalez[]; kdy: number };
const mezipamet = new Map<string, Zaznam>();
const PLATNOST_MS = 60_000;

export type VysledekHledani =
  | { ok: true; vyhledavac: string; nalezy: Nalez[]; zMezipameti: boolean }
  | { ok: false; duvod: string };

export async function hledej(d: Dotaz): Promise<VysledekHledani> {
  const p = poskytovatel();
  if (!p) return { ok: false, duvod: NENASTAVENO };

  const klic = `${p.nazev}:${d.dotaz}:${d.maxVysledku ?? 10}:${d.cerstvost ?? ""}`;
  const hit = mezipamet.get(klic);
  if (hit && Date.now() - hit.kdy < PLATNOST_MS) {
    return { ok: true, vyhledavac: p.nazev, nalezy: hit.nalezy, zMezipameti: true };
  }

  try {
    const nalezy = await p.hledej(d);
    mezipamet.set(klic, { nalezy, kdy: Date.now() });
    // Mezipaměť nesmí růst donekonečna.
    if (mezipamet.size > 60) mezipamet.delete(mezipamet.keys().next().value as string);

    log("info", "web", "hledání dokončeno", { vyhledavac: p.nazev, pocet: nalezy.length });
    return { ok: true, vyhledavac: p.nazev, nalezy, zMezipameti: false };
  } catch (err) {
    log("error", "web", "hledání selhalo", {
      vyhledavac: p.nazev, error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, duvod: "Webové vyhledávání momentálně není dostupné." };
  }
}
