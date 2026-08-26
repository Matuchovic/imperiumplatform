import type { Dotaz, Nalez, WebPoskytovatel } from "./typy";
import { domena, kvalitaZdroje } from "./validace";

/**
 * Poskytovatelé webového vyhledávání.
 *
 * Kód konkrétní služby zůstává tady, zbytek systému pracuje
 * s jednotným tvarem `Nalez`. Bez klíče se nevrací vymyšlené
 * výsledky — funkce se prostě označí za nenastavenou.
 */

const cas = (ms: number) => AbortSignal.timeout(ms);

class Brave implements WebPoskytovatel {
  nazev = "Brave";
  dostupny() { return Boolean(process.env.BRAVE_API_KEY); }

  async hledej(d: Dotaz): Promise<Nalez[]> {
    const key = process.env.BRAVE_API_KEY!;
    const pocet = Math.min(20, Math.max(1, d.maxVysledku ?? 10));
    const stari = d.cerstvost === "den" ? "&freshness=pd"
      : d.cerstvost === "tyden" ? "&freshness=pw"
      : d.cerstvost === "mesic" ? "&freshness=pm" : "";

    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(d.dotaz)}&count=${pocet}&country=cz&search_lang=cs${stari}`,
      { headers: { Accept: "application/json", "X-Subscription-Token": key }, signal: cas(9000) }
    );
    if (!res.ok) throw new Error(`Brave odpověděl ${res.status}`);

    const j = await res.json();
    return (j?.web?.results ?? []).map((r: Record<string, string>) => ({
      nazev: r.title ?? "",
      url: r.url ?? "",
      utrzek: (r.description ?? "").replace(/<[^>]+>/g, "").slice(0, 300),
      domena: domena(r.url ?? ""),
      vydano: r.age ?? r.page_age ?? undefined,
      kvalita: kvalitaZdroje(r.url ?? ""),
    }));
  }
}

class Tavily implements WebPoskytovatel {
  nazev = "Tavily";
  dostupny() { return Boolean(process.env.TAVILY_API_KEY); }

  async hledej(d: Dotaz): Promise<Nalez[]> {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: d.dotaz,
        max_results: Math.min(20, Math.max(1, d.maxVysledku ?? 10)),
      }),
      signal: cas(11000),
    });
    if (!res.ok) throw new Error(`Tavily odpověděl ${res.status}`);

    const j = await res.json();
    return (j?.results ?? []).map((r: Record<string, string>) => ({
      nazev: r.title ?? "",
      url: r.url ?? "",
      utrzek: (r.content ?? "").slice(0, 300),
      domena: domena(r.url ?? ""),
      vydano: r.published_date ?? undefined,
      kvalita: kvalitaZdroje(r.url ?? ""),
    }));
  }
}

const POSKYTOVATELE: WebPoskytovatel[] = [new Brave(), new Tavily()];

export function poskytovatel(): WebPoskytovatel | null {
  return POSKYTOVATELE.find((p) => p.dostupny()) ?? null;
}

export const NENASTAVENO =
  "WEB SEARCH PROVIDER NOT CONFIGURED — chybí BRAVE_API_KEY nebo TAVILY_API_KEY.";
