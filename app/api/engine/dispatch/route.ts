import { NextResponse } from "next/server";
import { scanForValue } from "@/lib/engine/scan";
import { autoApprovable, dispatchCandidates } from "@/lib/engine/dispatch";
import { serviceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Plně automatický běh: sken → roztřídění → rozeslání.
 *
 * Pásma Základ a Standard odcházejí sama. Rozšířený a Odvážný čekají
 * na člověka — mají série proher přes dvacet tiketů a jednou vypuštěný
 * tip se nedá vzít zpátky.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 401 });
  }

  try {
    const db = serviceClient();

    // Nouzový vypínač má přednost před vším ostatním.
    const { data: cfg } = await db
      .from("app_settings")
      .select("automations_paused")
      .eq("id", true)
      .maybeSingle<{ automations_paused: boolean }>();

    if (cfg?.automations_paused) {
      return NextResponse.json({ ok: true, paused: true, tickets: 0 });
    }

    const scan = await scanForValue();
    const { auto, manual } = autoApprovable(scan.candidates);

    if (scan.candidates.length > 0) {
      await db.from("candidates").insert(
        scan.candidates.map((c) => ({
          event_id: c.matchId,
          league: c.sport,
          event_name: c.event,
          market: c.market,
          selection: c.selection,
          sharp_odds: c.sharpOdds,
          fair_prob: c.fairProb,
          offered_odds: c.offeredOdds,
          offered_by: c.offeredBy,
          threshold_odds: c.thresholdOdds,
          ev: c.ev,
          units: c.units,
          commence_at: c.commenceTime,
          status: c.blocked ? "rejected" : auto.includes(c) ? "approved" : "pending",
          blocked_reason: c.blocked ?? null,
        }))
      );
    }

    const result = await dispatchCandidates(auto);

    return NextResponse.json({
      ok: true,
      scanned: scan.scannedMatches,
      found: scan.candidates.length,
      autoSent: auto.length,
      awaitingApproval: manual.length,
      ...result,
    });
  } catch (err) {
    console.error("[dispatch] selhání:", err);
    return NextResponse.json({ error: "Běh selhal." }, { status: 500 });
  }
}
