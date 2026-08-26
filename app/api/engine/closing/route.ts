import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/providers/odds";
import { clv } from "@/lib/engine/math";

export const dynamic = "force-dynamic";

/**
 * Sběr uzavíracích kurzů. CLV je jediná metrika, která se ustálí dřív
 * než zisk — bez ní se roky nedozvíš, jestli systém funguje.
 *
 * Ručně to nikdo dělat nebude, proto to musí běžet samo, těsně
 * před výkopem.
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 401 });
  }

  try {
    const db = serviceClient();
    const soon = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: rows } = await db
      .from("candidates")
      .select("id, event_id, market, selection, offered_odds, commence_at")
      .lte("commence_at", soon)
      .gte("commence_at", new Date().toISOString())
      .eq("status", "approved")
      .limit(100);

    if (!rows?.length) return NextResponse.json({ ok: true, captured: 0 });

    const provider = getProvider();
    let captured = 0;

    for (const r of rows) {
      try {
        const match = await provider.closingOdds?.(r.event_id, r.market, r.selection);
        if (!match) continue;
        await db.from("tickets")
          .update({ closing_odds: match, clv: clv(r.offered_odds, match) })
          .eq("candidate_id", r.id)
          .is("closing_odds", null);
        captured++;
      } catch {
        // Jeden nedostupný zápas nesmí shodit celý běh.
      }
    }

    return NextResponse.json({ ok: true, captured });
  } catch (err) {
    console.error("[closing]", err);
    return NextResponse.json({ error: "Sběr selhal." }, { status: 500 });
  }
}

/**
 * Vercel spouští cron metodou GET, ne POST. Bez GET by se sběr uzavíracích kurzů
 * tiše nikdy nespustilo — route by vracela 405 a v logu by nebylo nic,
 * co by na to upozornilo.
 *
 * POST zůstává pro ruční spuštění z terminálu.
 */
export const GET = run;
export const POST = run;
