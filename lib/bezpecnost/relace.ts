import { serviceClient } from "@/lib/supabase/server";
import { rozpoznejZarizeni, ipZHlavicek, otiskZarizeni } from "./otisk";
import { log } from "@/lib/log";

/**
 * Evidence relací.
 *
 * Zapisuje se při každém načtení chráněné stránky. Zápis nikdy
 * neshodí stránku — když selže, zaloguje se a pokračuje se dál.
 */

/** Lokalizace IP. Bez klíče se prostě přeskočí. */
async function kdeJe(ip: string): Promise<{ zeme?: string; mesto?: string; vpn: boolean }> {
  const token = process.env.IPINFO_TOKEN;
  if (!token) return { vpn: false };

  try {
    const res = await fetch(`https://ipinfo.io/${ip}?token=${token}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { vpn: false };
    const d = await res.json();
    return {
      zeme: d.country ?? undefined,
      mesto: d.city ?? undefined,
      // Hosting znamená datové centrum, tedy skoro vždy VPN nebo proxy.
      vpn: Boolean(d.privacy?.vpn || d.privacy?.proxy || d.privacy?.hosting),
    };
  } catch {
    return { vpn: false };
  }
}

export async function zaznamenejRelaci(userId: string, h: Headers): Promise<void> {
  try {
    const ua = h.get("user-agent") ?? "";
    const otisk = otiskZarizeni(ua, h.get("accept-language"));
    const z = rozpoznejZarizeni(ua, h.get("sec-fetch-site"));
    const ip = ipZHlavicek(h);

    const db = serviceClient();

    const { data: existuje } = await db
      .from("relace").select("id, zeme")
      .eq("user_id", userId).eq("otisk", otisk).is("ukoncena_at", null)
      .maybeSingle<{ id: number; zeme: string | null }>();

    if (existuje) {
      // Jen posun času poslední aktivity — nová relace nevzniká.
      await db.from("relace").update({ posledni: new Date().toISOString() }).eq("id", existuje.id);
      return;
    }

    const misto = ip ? await kdeJe(ip) : { vpn: false };

    await db.from("relace").insert({
      user_id: userId,
      otisk,
      ip,
      zeme: misto.zeme ?? null,
      mesto: misto.mesto ?? null,
      vpn: misto.vpn,
      zarizeni: z.druh,
      system: z.system,
      prohlizec: z.prohlizec,
      pwa: z.pwa,
    });

    // Nové zařízení nebo cizí země stojí za záznam — ne jako poplach,
    // ale aby se dalo zpětně dohledat.
    await db.from("bezpecnostni_udalosti").insert({
      typ: "nove_zarizeni",
      zavaznost: misto.vpn || (misto.zeme && misto.zeme !== "CZ") ? "pozor" : "info",
      user_id: userId,
      ip,
      zeme: misto.zeme ?? null,
      detail: `${z.system} · ${z.prohlizec}${z.pwa ? " · PWA" : ""}${misto.vpn ? " · VPN" : ""}`,
    });
  } catch (err) {
    // Evidence relace nesmí zablokovat přístup do systému.
    log("warn", "bezpecnost", "zápis relace selhal", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function ukonciRelaci(id: number, kdo: string): Promise<boolean> {
  try {
    const db = serviceClient();
    const { error } = await db
      .from("relace")
      .update({ ukoncena_at: new Date().toISOString(), ukoncil: kdo })
      .eq("id", id).is("ukoncena_at", null);
    return !error;
  } catch {
    return false;
  }
}
