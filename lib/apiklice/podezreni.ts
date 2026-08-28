import { serviceClient } from "@/lib/supabase/server";
import { adresaZadatele } from "./ip";
import type { DruhPodezreni as Druh } from "./druhy";

/**
 * Rozpoznání podezřelého chování.
 *
 * Ukradený klíč se pozná podle toho, že se chová jinak — najednou
 * hodně volání, hodně chyb, nebo přístup odjinud. Bez upozornění
 * se to zjistí až ze škody.
 *
 * Zápis je jednou za druh a den, aby z toho nebyl proud,
 * který nikdo nečte.
 */

export type { DruhPodezreni as Druh } from "./druhy";

/** Práh pro nárůst: kolikrát víc než průměr posledních dní. */
const NASOBEK = 4;
/** Kolik chyb za hodinu už znamená, že to není překlep. */
const CHYB_ZA_HODINU = 20;

export async function zkontrolujPodezreni(klicId: number, req: Request): Promise<void> {
  try {
    const db = serviceClient();
    const ted = new Date();
    const predHodinou = new Date(ted.getTime() - 3_600_000).toISOString();
    const predTydnem = new Date(ted.getTime() - 7 * 864e5).toISOString();

    const { data } = await db.from("api_volani")
      .select("stav, ip, created_at")
      .eq("klic_id", klicId)
      .gte("created_at", predTydnem)
      .limit(5000);

    const vse = (data ?? []) as { stav: number; ip: string | null; created_at: string }[];
    const hodina = vse.filter((v) => v.created_at >= predHodinou);

    // ---- řada chyb ----
    const chyb = hodina.filter((v) => v.stav >= 400).length;
    if (chyb >= CHYB_ZA_HODINU) {
      await zapis(klicId, "chyby", `${chyb} neúspěšných volání za poslední hodinu.`, { chyb });
    }

    // ---- prudký nárůst ----
    const dnu = 7;
    const prumerZaHodinu = vse.length / (dnu * 24);
    if (prumerZaHodinu > 1 && hodina.length > prumerZaHodinu * NASOBEK) {
      await zapis(klicId, "naraz",
        `${hodina.length} volání za hodinu proti běžným ${Math.round(prumerZaHodinu)}.`,
        { hodina: hodina.length, obvykle: Math.round(prumerZaHodinu) });
    }

    // ---- nová adresa ----
    const ip = adresaZadatele(req.headers);
    if (ip) {
      // Adresa z dnešního volání se do porovnání nepočítá.
      const znameAdresy = new Set(
        vse.filter((v) => v.created_at < predHodinou).map((v) => v.ip).filter(Boolean)
      );
      if (znameAdresy.size > 0 && !znameAdresy.has(ip)) {
        await zapis(klicId, "nova_ip", `Volání z nové adresy ${ip}.`, { ip });
      }
    }

    // ---- provoz v noci ----
    const hodinaDne = ted.getHours();
    if (hodinaDne >= 1 && hodinaDne < 5) {
      const nocni = vse.filter((v) => {
        const h = new Date(v.created_at).getHours();
        return h >= 1 && h < 5;
      });
      // Když klíč v noci nikdy nepracoval, dnešní provoz je odchylka.
      if (nocni.length <= hodina.length) {
        await zapis(klicId, "v_noci", "Klíč pracuje v době, kdy jindy nepracuje.", {});
      }
    }
  } catch { /* kontrola nesmí shodit odpověď */ }
}

async function zapis(
  klicId: number, druh: Druh, popis: string, podrobnosti: Record<string, unknown>
): Promise<void> {
  const db = serviceClient();
  // Jednou za druh a den — o to se stará jedinečný index v databázi.
  await db.from("api_podezreni")
    .insert({ klic_id: klicId, druh, popis, podrobnosti })
    .then(() => undefined, () => undefined);
}
