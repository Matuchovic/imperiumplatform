import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { serviceClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

/**
 * Webhooky opačným směrem.
 *
 * Dnes se web ptá systému. Webhook to obrátí — systém se ozve sám,
 * když se něco stane, takže se web nemusí ptát pořád dokola.
 *
 * Server only.
 */

export const UDALOSTI = {
  "tip.publikovan": "Publikován nový tip",
  "vysledek.zaznamenan": "Zapsán výsledek tiketu",
  "statistiky.zmena": "Změnila se veřejná čísla",
  "klient.novy": "Přibyl klient",
} as const;

export type Udalost = keyof typeof UDALOSTI;

export const noveTajemstvi = (): string => `whsec_${randomBytes(24).toString("base64url")}`;

/**
 * Podpis zprávy.
 *
 * Web podle něj pozná, že přišla opravdu od nás. Bez podpisu
 * by mu kdokoli mohl poslat vymyšlenou událost.
 *
 * Do podpisu jde i čas — jinak by šla zachycená zpráva
 * přehrát znovu i za týden.
 */
export function podepis(tajemstvi: string, telo: string, cas: number): string {
  return createHmac("sha256", tajemstvi).update(`${cas}.${telo}`).digest("hex");
}

/** Ověření podpisu v konstantním čase. Pro dokumentaci na webu. */
export function overPodpis(
  tajemstvi: string, telo: string, cas: number, podpis: string, tolerance = 300
): boolean {
  // Stará zpráva se odmítne, i kdyby podpis seděl.
  if (Math.abs(Date.now() / 1000 - cas) > tolerance) return false;

  const ocekavany = Buffer.from(podepis(tajemstvi, telo, cas), "hex");
  const dorucen = Buffer.from(podpis, "hex");
  if (ocekavany.length !== dorucen.length) return false;
  return timingSafeEqual(ocekavany, dorucen);
}

/** Prodlevy mezi pokusy. Rostou, aby se nespadlý web nezahltil. */
const PRODLEVY_MS = [0, 5_000, 30_000];

/**
 * Odeslání události všem odběratelům.
 *
 * Nikdy nevyhodí chybu — webhook nesmí shodit akci, která ho vyvolala.
 */
export async function posliUdalost(u: Udalost, data: Record<string, unknown>): Promise<void> {
  try {
    const db = serviceClient();
    const { data: hooky } = await db.from("api_webhooky")
      .select("id, url, tajemstvi, udalosti")
      .eq("aktivni", true);

    const cile = (hooky ?? []).filter((h) =>
      (h.udalosti as string[]).includes(u)
    ) as { id: number; url: string; tajemstvi: string }[];

    for (const h of cile) void posli(h, u, data);
  } catch (err) {
    log("error", "webhook", "odeslání selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function posli(
  h: { id: number; url: string; tajemstvi: string },
  udalost: Udalost,
  data: Record<string, unknown>
): Promise<void> {
  const cas = Math.floor(Date.now() / 1000);
  const telo = JSON.stringify({ udalost, cas, data });
  const podpis = podepis(h.tajemstvi, telo, cas);
  const db = serviceClient();

  for (let pokus = 1; pokus <= PRODLEVY_MS.length; pokus++) {
    if (PRODLEVY_MS[pokus - 1] > 0) {
      await new Promise((r) => setTimeout(r, PRODLEVY_MS[pokus - 1]));
    }

    let stav: number | null = null;
    let chyba: string | null = null;

    try {
      const r = await fetch(h.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BI-Podpis": podpis,
          "X-BI-Cas": String(cas),
          "X-BI-Udalost": udalost,
        },
        body: telo,
        signal: AbortSignal.timeout(10_000),
      });
      stav = r.status;
    } catch (e) {
      chyba = e instanceof Error ? e.message : "spojení selhalo";
    }

    await db.from("api_webhook_pokusy").insert({
      webhook_id: h.id, udalost, telo: JSON.parse(telo), stav, pokus, chyba,
    }).then(() => undefined, () => undefined);

    if (stav && stav < 400) {
      await db.from("api_webhooky")
        .update({ posledni_ok: new Date().toISOString(), neuspechu: 0, posledni_chyba: null })
        .eq("id", h.id);
      return;
    }

    if (pokus === PRODLEVY_MS.length) {
      /**
       * Po třech marných pokusech se počítadlo zvýší.
       *
       * Webhook, který dlouho neodpovídá, se vypne sám — jinak by
       * systém donekonečna klepal na adresu, která už neexistuje.
       */
      const { data: h2 } = await db.from("api_webhooky")
        .select("neuspechu").eq("id", h.id).maybeSingle<{ neuspechu: number }>();

      const kolik = (h2?.neuspechu ?? 0) + 1;
      await db.from("api_webhooky").update({
        neuspechu: kolik,
        posledni_chyba: chyba ?? `stav ${stav}`,
        aktivni: kolik < 20,
      }).eq("id", h.id);
    }
  }
}
