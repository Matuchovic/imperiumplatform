import { log } from "@/lib/log";

/**
 * Fakturoid.
 *
 * Přihlašovací údaje zůstávají v proměnných prostředí, ne v databázi —
 * do té vidí každý, kdo má service_role, a klíč k fakturaci tam nemá
 * co dělat. V nastavení se ukazuje jen stav a nastavení, které tajné není.
 *
 * API v3 používá OAuth s pověřením klienta: z ID a tajemství se vymění
 * krátkodobý token.
 */

const OAUTH = "https://app.fakturoid.cz/api/v3/oauth/token";

let token: { hodnota: string; platiDo: number } | null = null;

export type Stav =
  | { pripojeno: true; ucet: string; nazev?: string }
  | { pripojeno: false; duvod: string };

function konfigurace() {
  return {
    slug: process.env.FAKTUROID_SLUG,
    id: process.env.FAKTUROID_CLIENT_ID,
    tajemstvi: process.env.FAKTUROID_CLIENT_SECRET,
    email: process.env.FAKTUROID_EMAIL,
  };
}

async function ziskejToken(): Promise<string | null> {
  const k = konfigurace();
  if (!k.id || !k.tajemstvi) return null;

  // Token platí hodinu. Znovu se žádá až minutu před vypršením.
  if (token && Date.now() < token.platiDo - 60_000) return token.hodnota;

  try {
    const res = await fetch(OAUTH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `BETIMPERIUM <${k.email ?? "info@betimperium.cz"}>`,
        Authorization: `Basic ${Buffer.from(`${k.id}:${k.tajemstvi}`).toString("base64")}`,
      },
      body: JSON.stringify({ grant_type: "client_credentials" }),
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) {
      log("error", "fakturoid", "token se nepodařilo získat", { stav: res.status });
      return null;
    }
    const d = await res.json();
    token = {
      hodnota: d.access_token,
      platiDo: Date.now() + (Number(d.expires_in) || 3600) * 1000,
    };
    return token.hodnota;
  } catch (err) {
    log("error", "fakturoid", "token selhal", { error: String(err).slice(0, 120) });
    return null;
  }
}

async function volej(cesta: string, init?: RequestInit) {
  const k = konfigurace();
  const t = await ziskejToken();
  if (!t || !k.slug) return null;

  return fetch(`https://app.fakturoid.cz/api/v3/accounts/${k.slug}${cesta}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": `BETIMPERIUM <${k.email ?? "info@betimperium.cz"}>`,
      Authorization: `Bearer ${t}`,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(11_000),
  });
}

/** Ověří spojení skutečným voláním, ne přítomností proměnné. */
export async function overSpojeni(): Promise<Stav> {
  const k = konfigurace();
  const chybi = [
    !k.slug && "FAKTUROID_SLUG",
    !k.id && "FAKTUROID_CLIENT_ID",
    !k.tajemstvi && "FAKTUROID_CLIENT_SECRET",
  ].filter(Boolean);

  if (chybi.length) return { pripojeno: false, duvod: `Chybí ${chibiText(chybi as string[])}.` };

  try {
    const res = await volej("/account.json");
    if (!res) return { pripojeno: false, duvod: "Nepodařilo se získat token." };
    if (!res.ok) return { pripojeno: false, duvod: `Fakturoid odpověděl ${res.status}.` };

    const d = await res.json();
    return { pripojeno: true, ucet: k.slug!, nazev: d?.name };
  } catch (err) {
    return { pripojeno: false, duvod: `Spojení selhalo: ${String(err).slice(0, 90)}` };
  }
}

const chibiText = (x: string[]) => x.join(", ");

export type Faktura = {
  jmeno: string;
  email?: string;
  radky: { nazev: string; cena: number; mnozstvi?: number }[];
  splatnostDni?: number;
};

/** Vystaví fakturu. Vrací odkaz na ni, ne jen potvrzení. */
export async function vystavFakturu(f: Faktura) {
  try {
    const res = await volej("/invoices.json", {
      method: "POST",
      body: JSON.stringify({
        custom_id: `bi-${Date.now()}`,
        client_name: f.jmeno,
        client_email: f.email,
        due: f.splatnostDni ?? 14,
        lines: f.radky.map((r) => ({
          name: r.nazev,
          quantity: r.mnozstvi ?? 1,
          unit_price: r.cena,
        })),
      }),
    });
    if (!res) return { ok: false as const, duvod: "Fakturoid není nastavený." };
    if (!res.ok) {
      const telo = await res.text().catch(() => "");
      return { ok: false as const, duvod: `Fakturoid odpověděl ${res.status}: ${telo.slice(0, 150)}` };
    }
    const d = await res.json();
    return { ok: true as const, id: d.id, cislo: d.number, odkaz: d.public_html_url };
  } catch (err) {
    return { ok: false as const, duvod: `Vystavení selhalo: ${String(err).slice(0, 90)}` };
  }
}
