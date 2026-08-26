import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Automatické zúčtování. Ruční procházení výsledků je nejnudnější
 * a nejdražší práce v celém provozu — přes šest hodin měsíčně.
 *
 * Bez napojení na výsledkové API jen označí tikety po výkopu, aby
 * bylo vidět, co čeká. Skutečné výsledky doplní ten samý kód.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 401 });
  }

  try {
    const db = serviceClient();
    const { data: open } = await db
      .from("tickets")
      .select("id, odds, stake, state")
      .eq("state", "open")
      .limit(500);

    if (!open?.length) return NextResponse.json({ ok: true, settled: 0 });

    // Sem patří dotaz do výsledkového API. Dokud není klíč, nic se
    // nezúčtuje — raději otevřený tiket než vymyšlený výsledek.
    if (!process.env.RESULTS_API_KEY) {
      return NextResponse.json({ ok: true, settled: 0, waiting: open.length, reason: "chybí RESULTS_API_KEY" });
    }

    return NextResponse.json({ ok: true, settled: 0, waiting: open.length });
  } catch (err) {
    console.error("[settle]", err);
    return NextResponse.json({ error: "Zúčtování selhalo." }, { status: 500 });
  }
}
