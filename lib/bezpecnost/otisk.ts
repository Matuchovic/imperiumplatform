/**
 * Rozpoznání zařízení a sítě z požadavku.
 *
 * Čisté funkce nad hlavičkami — žádná databáze, takže jdou otestovat.
 * Nejde o sledování, ale o to, aby v seznamu relací šlo poznat
 * „můj notebook" od „někdo cizí z jiné země".
 */

export type Zarizeni = {
  druh: "pocitac" | "mobil" | "tablet" | "nezname";
  system: string;
  prohlizec: string;
  pwa: boolean;
};

export function rozpoznejZarizeni(ua: string, secFetchSite?: string | null): Zarizeni {
  const u = ua.toLowerCase();

  const druh: Zarizeni["druh"] =
    /ipad|tablet/.test(u) ? "tablet"
    : /mobile|iphone|android/.test(u) ? "mobil"
    : /windows|macintosh|linux|cros/.test(u) ? "pocitac"
    : "nezname";

  const system =
    /iphone|ipad|ios/.test(u) ? "iOS"
    : /android/.test(u) ? "Android"
    : /macintosh|mac os/.test(u) ? "macOS"
    : /windows/.test(u) ? "Windows"
    : /cros/.test(u) ? "ChromeOS"
    : /linux/.test(u) ? "Linux"
    : "neznámý";

  // Pořadí je důležité: Edge i Chrome se hlásí jako Safari.
  const prohlizec =
    /edg\//.test(u) ? "Edge"
    : /opr\/|opera/.test(u) ? "Opera"
    : /firefox/.test(u) ? "Firefox"
    : /chrome|crios/.test(u) ? "Chrome"
    : /safari/.test(u) ? "Safari"
    : "neznámý";

  // Nainstalovaná aplikace neposílá odkazující stránku.
  const pwa = secFetchSite === "none" && druh !== "nezname";

  return { druh, system, prohlizec, pwa };
}

/** IP z hlaviček proxy. Vercel posílá x-forwarded-for. */
export function ipZHlavicek(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for");
  // Za proxy může být adres víc. První je klientská.
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return h.get("x-real-ip") ?? null;
}

/**
 * Zkrácení pro zobrazení. Celá adresa se ukazuje až na vyžádání
 * a přístup se zapíše do auditu.
 */
export function zkratIp(ip: string | null): string {
  if (!ip) return "neznámá";
  if (ip.includes(":")) {
    const c = ip.split(":");
    return `${c[0]}:${c[1]}:•••`;
  }
  const o = ip.split(".");
  return o.length === 4 ? `${o[0]}.${o[1]}.•••.•••` : "neznámá";
}

/**
 * Otisk zařízení. Neslouží k identifikaci osoby — jen k rozlišení,
 * jestli jde o návrat na stejné zařízení, nebo o nové.
 */
export function otiskZarizeni(ua: string, jazyk: string | null): string {
  const z = rozpoznejZarizeni(ua);
  const zaklad = `${z.system}|${z.prohlizec}|${z.druh}|${jazyk ?? ""}`;

  let h = 0;
  for (let i = 0; i < zaklad.length; i++) {
    h = (h << 5) - h + zaklad.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

/** Doba trvání v čitelném tvaru. */
export function trvani(od: string, do_?: string | null): string {
  const min = Math.max(0, Math.round((new Date(do_ ?? Date.now()).getTime() - new Date(od).getTime()) / 60000));
  if (min < 1) return "právě teď";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const z = min % 60;
  return z ? `${h} h ${z} min` : `${h} h`;
}
