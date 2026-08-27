import { log } from "@/lib/log";

/**
 * Stripe.
 *
 * Klíč zůstává v proměnných prostředí. Systém sám nikdy neúčtuje —
 * vytváří odkaz k platbě, na který klient klikne. Strhávání peněz
 * bez jeho vědomí je přesně to, co se u sázkové služby nemá dít.
 */

const API = "https://api.stripe.com/v1";

export type Stav =
  | { pripojeno: true; rezim: "test" | "ostry"; ucet?: string }
  | { pripojeno: false; duvod: string };

const klic = () => process.env.STRIPE_SECRET_KEY;

async function volej(cesta: string, telo?: Record<string, string>) {
  const k = klic();
  if (!k) return null;

  return fetch(`${API}${cesta}`, {
    method: telo ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${k}`,
      ...(telo ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: telo ? new URLSearchParams(telo) : undefined,
    signal: AbortSignal.timeout(11_000),
  });
}

export async function overSpojeni(): Promise<Stav> {
  const k = klic();
  if (!k) return { pripojeno: false, duvod: "Chybí STRIPE_SECRET_KEY." };

  // Testovací klíč začíná sk_test_. Rozlišení je důležité —
  // v testovacím režimu se skutečné peníze nepohnou.
  const rezim = k.startsWith("sk_test_") ? "test" : "ostry";

  try {
    const res = await volej("/account");
    if (!res) return { pripojeno: false, duvod: "Klíč není nastavený." };
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      let zprava = `Stripe odpověděl ${res.status}`;
      try { zprava = JSON.parse(t)?.error?.message ?? zprava; } catch { /* stačí kód */ }
      return { pripojeno: false, duvod: zprava };
    }
    const d = await res.json();
    return { pripojeno: true, rezim, ucet: d?.business_profile?.name ?? d?.id };
  } catch (err) {
    return { pripojeno: false, duvod: `Spojení selhalo: ${String(err).slice(0, 90)}` };
  }
}

/**
 * Vytvoří odkaz k platbě. Systém nikdy nestrhává sám —
 * platbu potvrzuje klient.
 */
export async function odkazKPlatbe(popis: string, castkaKc: number, email?: string) {
  try {
    const cena = await volej("/prices", {
      currency: "czk",
      unit_amount: String(Math.round(castkaKc * 100)),
      "product_data[name]": popis,
    });
    if (!cena) return { ok: false as const, duvod: "Stripe není nastavený." };
    if (!cena.ok) {
      const t = await cena.text().catch(() => "");
      return { ok: false as const, duvod: `Stripe: ${t.slice(0, 150)}` };
    }
    const c = await cena.json();

    const odkaz = await volej("/payment_links", {
      "line_items[0][price]": c.id,
      "line_items[0][quantity]": "1",
      ...(email ? { "metadata[email]": email } : {}),
    });
    if (!odkaz?.ok) {
      const t = await odkaz?.text().catch(() => "") ?? "";
      return { ok: false as const, duvod: `Stripe: ${t.slice(0, 150)}` };
    }
    const o = await odkaz.json();

    log("info", "stripe", "odkaz k platbě vytvořen", { castka: castkaKc });
    return { ok: true as const, odkaz: o.url, id: o.id };
  } catch (err) {
    return { ok: false as const, duvod: `Vytvoření odkazu selhalo: ${String(err).slice(0, 90)}` };
  }
}
