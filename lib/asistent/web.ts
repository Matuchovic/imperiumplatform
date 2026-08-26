/**
 * Hledání na webu.
 *
 * Běží na serveru, takže může volat libovolnou veřejnou adresu.
 * Postup je odstupňovaný: s klíčem se použije pořádný vyhledávač,
 * bez klíče zdroje, které klíč nepotřebují. Funguje tedy hned
 * a s klíčem líp — místo aby to bez něj nešlo vůbec.
 *
 * Každý výsledek nese `zdroj: "web"`. Rozhraní podle toho odliší
 * cizí informace od našich dat, protože vlastním číslům věříš
 * bezvýhradně a cizí stránce ne.
 */

export type Nalez = {
  nazev: string;
  url: string;
  popis: string;
  odkud: string;
};

const cas = (ms: number) => AbortSignal.timeout(ms);

/** Brave — 2 000 dotazů měsíčně zdarma. */
async function brave(dotaz: string): Promise<Nalez[] | null> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(dotaz)}&count=5&country=cz&search_lang=cs`,
      { headers: { Accept: "application/json", "X-Subscription-Token": key }, signal: cas(8000) }
    );
    if (!res.ok) return null;
    const d = await res.json();
    return (d?.web?.results ?? []).slice(0, 5).map((r: Record<string, string>) => ({
      nazev: r.title ?? "",
      url: r.url ?? "",
      popis: (r.description ?? "").replace(/<[^>]+>/g, "").slice(0, 220),
      odkud: "Brave",
    }));
  } catch {
    return null;
  }
}

/** Tavily — vrací už pročištěný text, 1 000 dotazů měsíčně zdarma. */
async function tavily(dotaz: string): Promise<Nalez[] | null> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query: dotaz, max_results: 5 }),
      signal: cas(10000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return (d?.results ?? []).slice(0, 5).map((r: Record<string, string>) => ({
      nazev: r.title ?? "",
      url: r.url ?? "",
      popis: (r.content ?? "").slice(0, 220),
      odkud: "Tavily",
    }));
  } catch {
    return null;
  }
}

/**
 * Bez klíče: Wikipedie a okamžité odpovědi DuckDuckGo.
 *
 * Nenahradí vyhledávač, ale na dotazy typu „co je X" odpoví
 * a hlavně to funguje od první minuty.
 */
async function bezKlice(dotaz: string): Promise<Nalez[]> {
  const ven: Nalez[] = [];

  try {
    const res = await fetch(
      `https://cs.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(dotaz)}&srlimit=3&format=json&origin=*`,
      { signal: cas(6000) }
    );
    if (res.ok) {
      const d = await res.json();
      for (const r of d?.query?.search ?? []) {
        ven.push({
          nazev: r.title,
          url: `https://cs.wikipedia.org/wiki/${encodeURIComponent(r.title)}`,
          popis: String(r.snippet ?? "").replace(/<[^>]+>/g, "").slice(0, 220),
          odkud: "Wikipedie",
        });
      }
    }
  } catch { /* zdroj vynecháme, ostatní pokračují */ }

  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(dotaz)}&format=json&no_html=1&skip_disambig=1`,
      { signal: cas(6000) }
    );
    if (res.ok) {
      const d = await res.json();
      if (d?.AbstractText) {
        ven.push({
          nazev: d.Heading || dotaz,
          url: d.AbstractURL || "",
          popis: String(d.AbstractText).slice(0, 220),
          odkud: "DuckDuckGo",
        });
      }
    }
  } catch { /* stejně */ }

  return ven;
}

export async function hledejNaWebu(dotaz: string): Promise<{
  zdroj: "web";
  vyhledavac: string;
  pocet: number;
  nalezy: Nalez[];
  poznamka?: string;
}> {
  // Pořadí podle kvality. První, který odpoví, vyhrává.
  const vysledek = (await brave(dotaz)) ?? (await tavily(dotaz));

  if (vysledek && vysledek.length > 0) {
    return { zdroj: "web", vyhledavac: vysledek[0].odkud, pocet: vysledek.length, nalezy: vysledek };
  }

  const zalozni = await bezKlice(dotaz);
  return {
    zdroj: "web",
    vyhledavac: "bez klíče",
    pocet: zalozni.length,
    nalezy: zalozni,
    poznamka:
      "Běží záložní zdroje. Pro plnohodnotné hledání doplň BRAVE_API_KEY nebo TAVILY_API_KEY.",
  };
}

/** Stáhne stránku a vrátí čitelný text. Na podrobnosti po hledání. */
export async function prectiStranku(url: string): Promise<{
  zdroj: "web";
  url: string;
  text?: string;
  chyba?: string;
}> {
  if (!/^https?:\/\//i.test(url)) return { zdroj: "web", url, chyba: "Neplatná adresa." };

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BETIMPERIUM/1.0" },
      signal: cas(9000),
    });
    if (!res.ok) return { zdroj: "web", url, chyba: `Stránka vrátila ${res.status}` };

    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    return { zdroj: "web", url, text };
  } catch (err) {
    return { zdroj: "web", url, chyba: `Nepodařilo se načíst: ${String(err).slice(0, 100)}` };
  }
}
