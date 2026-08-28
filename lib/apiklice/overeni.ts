import { serviceClient } from "@/lib/supabase/server";
import { otiskKlice } from "./hash";
import { domenaSedi, vyprsel, type Opravneni } from "./klice";
import { ipProchazi, adresaZadatele } from "./ip";
import { zkontrolujPodezreni } from "./podezreni";

/**
 * Ověření klíče u každého volání.
 *
 * Pořadí kontrol je záměrné: nejdřív to, co nestojí dotaz
 * do databáze, pak teprve zbytek.
 */

export type Overeno = {
  ok: true;
  id: number;
  nazev: string;
  opravneni: Opravneni[];
  /** Testovací klíč nezapisuje do ostrých dat. */
  nanecisto: boolean;
};

export type Zamitnuto = {
  ok: false;
  stav: number;
  duvod: string;
};

export async function overKlic(
  req: Request,
  potrebne: Opravneni
): Promise<Overeno | Zamitnuto> {
  const hlavicka = req.headers.get("authorization") ?? "";
  const klic = hlavicka.startsWith("Bearer ") ? hlavicka.slice(7).trim() : "";

  // Tvar zkontrolujeme dřív než databázi — ušetří to dotaz
  // při náhodném skenování.
  if (!klic || !/^bi_(live|test)_[A-Za-z0-9_-]{40,}$/.test(klic)) {
    return { ok: false, stav: 401, duvod: "Chybí nebo neplatný klíč." };
  }

  const db = serviceClient();
  const { data } = await db.from("api_klice")
    .select("id, nazev, opravneni, domeny, ip_seznam, limit_hod, plati_do, odvolany_at, dobehne_do, jen_nanecisto")
    .eq("otisk_hash", otiskKlice(klic))
    .maybeSingle<{
      id: number; nazev: string; opravneni: string[]; domeny: string[];
      ip_seznam: string[]; limit_hod: number; plati_do: string | null;
      odvolany_at: string | null; dobehne_do: string | null; jen_nanecisto: boolean;
    }>();

  /**
   * Stejná odpověď pro neexistující i odvolaný klíč.
   *
   * Rozlišení by útočníkovi řeklo, které klíče kdysi platily.
   */
  if (!data || data.odvolany_at) {
    return { ok: false, stav: 401, duvod: "Klíč neplatí." };
  }

  if (vyprsel(data.plati_do)) {
    return { ok: false, stav: 401, duvod: "Klíč vypršel." };
  }

  /**
   * Doběh po výměně.
   *
   * Vyměněný klíč ještě chvíli funguje, aby web nespadl ve chvíli,
   * kdy nikdo není u počítače. Po uplynutí lhůty přestane.
   */
  if (data.dobehne_do && new Date(data.dobehne_do) < new Date()) {
    return { ok: false, stav: 401, duvod: "Klíč byl vyměněn a jeho doběh skončil." };
  }

  /**
   * Adresa se kontroluje dřív než doména.
   *
   * Hlavičku s doménou si volající nastaví sám, adresu ne — takže
   * je to silnější pojistka a má mít přednost.
   */
  const ip = adresaZadatele(req.headers);
  if (!ipProchazi(data.ip_seznam, ip)) {
    return { ok: false, stav: 403, duvod: "Z téhle adresy klíč neplatí." };
  }

  const puvod = req.headers.get("origin") ?? req.headers.get("referer");
  if (!domenaSedi(data.domeny, puvod)) {
    return { ok: false, stav: 403, duvod: "Z téhle domény klíč neplatí." };
  }

  if (!data.opravneni.includes(potrebne)) {
    return { ok: false, stav: 403, duvod: `Klíč nemá oprávnění ${potrebne}.` };
  }

  /**
   * Hodinový limit.
   *
   * Počítá se z protokolu, ne z paměti — na Vercelu běží každý
   * požadavek jinde a sdílená paměť by nefungovala.
   */
  const pred = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db.from("api_volani")
    .select("id", { count: "exact", head: true })
    .eq("klic_id", data.id)
    .gte("created_at", pred);

  if ((count ?? 0) >= data.limit_hod) {
    return { ok: false, stav: 429, duvod: "Vyčerpaný hodinový limit." };
  }

  return {
    ok: true,
    id: data.id,
    nazev: data.nazev,
    opravneni: data.opravneni as Opravneni[],
    nanecisto: Boolean(data.jen_nanecisto),
  };
}

/** Zápis volání do protokolu. Nikdy nesmí shodit odpověď. */
export async function zapisVolani(v: {
  klicId: number | null;
  cesta: string;
  metoda: string;
  stav: number;
  req: Request;
  trvani: number;
  chyba?: string;
}): Promise<void> {
  try {
    const db = serviceClient();
    await db.from("api_volani").insert({
      klic_id: v.klicId,
      cesta: v.cesta,
      metoda: v.metoda,
      stav: v.stav,
      // Jen první adresa z řetězce proxy.
      ip: (v.req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
      puvod: v.req.headers.get("origin") ?? null,
      trvani_ms: v.trvani,
      chyba: v.chyba ?? null,
    });

    if (v.klicId && v.stav < 400) {
      await db.from("api_klice")
        .update({ posledni_pouziti: new Date().toISOString() })
        .eq("id", v.klicId);
    }

    // Kontrola běží po zápisu, aby viděla i právě proběhlé volání.
    if (v.klicId) void zkontrolujPodezreni(v.klicId, v.req);
  } catch { /* protokol nesmí shodit odpověď */ }
}
