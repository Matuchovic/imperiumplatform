import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/**
 * Diagnostika nastavení. Hlásí jen jestli proměnná existuje a jak je
 * dlouhá — nikdy hodnotu. Slouží k rozlišení "chybí konfigurace"
 * od "je chyba v kódu", což z produkční 500 nepoznáš.
 */
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

  return NextResponse.json({ env, supabase, cas: new Date().toISOString() });
}
