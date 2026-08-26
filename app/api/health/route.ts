import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/**
 * Diagnostika nastavení. Hlásí jen jestli proměnná existuje a jak je
 * dlouhá — nikdy hodnotu. Slouží k rozlišení "chybí konfigurace"
 * od "je chyba v kódu", což z produkční 500 nepoznáš.
 */
/** Ověří Groq skutečným voláním, ne jen přítomností proměnné. */
async function zkusGroq() {
  const key = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  if (!key) return { klic: false, model, stav: "GROQ_API_KEY chybí" };

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        max_tokens: 5,
        messages: [{ role: "user", content: "ok" }],
      }),
    });
    if (res.ok) return { klic: true, model, stav: "odpovídá" };

    const telo = await res.text().catch(() => "");
    let zprava = telo.slice(0, 160);
    try { zprava = JSON.parse(telo)?.error?.message ?? zprava; } catch {}
    return { klic: true, model, stav: `${res.status}: ${zprava}` };
  } catch (err) {
    return { klic: true, model, stav: `spojení selhalo: ${String(err).slice(0, 120)}` };
  }
}

export async function GET() {
  // Výpis konfigurace nepatří veřejně ani bez hodnot — prozrazuje,
  // které služby jsou zapojené.
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const check = (name: string) => {
    const v = process.env[name];
    return { nastaveno: Boolean(v), delka: v?.length ?? 0 };
  };

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: check("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: check("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: check("SUPABASE_SERVICE_ROLE_KEY"),
    ODDS_API_KEY: check("ODDS_API_KEY"),
    CRON_SECRET: check("CRON_SECRET"),
    GROQ_API_KEY: check("GROQ_API_KEY"),
    GROQ_MODEL: check("GROQ_MODEL"),
  };

  let supabase: { dostupna: boolean; detail?: string } = { dostupna: false };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anon) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon } });
      supabase = { dostupna: res.ok, detail: `HTTP ${res.status}` };
    } catch (err) {
      supabase = { dostupna: false, detail: String(err) };
    }
  } else {
    supabase = { dostupna: false, detail: "chybí URL nebo anon klíč" };
  }

  const groq = await zkusGroq();

  return NextResponse.json({ env, supabase, groq, cas: new Date().toISOString() });
}
