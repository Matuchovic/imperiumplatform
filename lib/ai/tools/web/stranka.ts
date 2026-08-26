import { overUrl, domena } from "./validace";
import type { Stranka } from "./typy";
import { log } from "@/lib/log";

/**
 * Stažení stránky a vytažení čitelného textu.
 *
 * Do modelu nesmí jít syrové HTML — je to plýtvání kontextem
 * a navigační balast výsledek jen zhoršuje. Vytáhne se nadpis,
 * nadpisy sekcí, datum vydání a text.
 */

const MAX_ZNAKU = 6000;
const MAX_BAJTU = 3_000_000;

export type VysledekStranky = { ok: true; stranka: Stranka } | { ok: false; duvod: string };

export async function stahni(vstup: string): Promise<VysledekStranky> {
  const verdikt = overUrl(vstup);
  if (!verdikt.ok) return { ok: false, duvod: verdikt.duvod };

  try {
    const res = await fetch(verdikt.url.toString(), {
      headers: { "User-Agent": "BETIMPERIUM/1.0 (+research)", Accept: "text/html" },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });

    // Po přesměrování se adresa ověřuje znovu — jinak by šlo
    // přesměrováním obejít kontrolu vnitřní sítě.
    const konecna = overUrl(res.url);
    if (!konecna.ok) return { ok: false, duvod: `Přesměrování: ${konecna.duvod}` };

    if (!res.ok) return { ok: false, duvod: `Stránka vrátila ${res.status}.` };

    const typ = res.headers.get("content-type") ?? "";
    if (!typ.includes("html") && !typ.includes("text")) {
      return { ok: false, duvod: `Nepodporovaný obsah (${typ.split(";")[0]}).` };
    }
    const delka = Number(res.headers.get("content-length") ?? 0);
    if (delka > MAX_BAJTU) return { ok: false, duvod: "Stránka je příliš velká." };

    const html = (await res.text()).slice(0, MAX_BAJTU);

    const nazev = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim().slice(0, 200);
    const vydano =
      html.match(/property=["']article:published_time["']\s+content=["']([^"']+)/i)?.[1] ??
      html.match(/name=["']date["']\s+content=["']([^"']+)/i)?.[1] ??
      html.match(/<time[^>]+datetime=["']([^"']+)/i)?.[1];

    const nadpisy = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 3)
      .slice(0, 12);

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_ZNAKU);

    return {
      ok: true,
      stranka: {
        url: res.url,
        domena: domena(res.url),
        nazev,
        text,
        nadpisy,
        vydano,
        stazeno: new Date().toISOString(),
      },
    };
  } catch (err) {
    log("warn", "web", "stažení stránky selhalo", { url: vstup, error: String(err).slice(0, 120) });
    return { ok: false, duvod: `Stránku se nepodařilo načíst.` };
  }
}
