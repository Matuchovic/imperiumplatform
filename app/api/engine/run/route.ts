import { NextResponse } from "next/server";
import { scanForValue } from "@/lib/engine/scan";
import { bandFor } from "@/lib/engine/bands";
import { requireAdmin } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Ruční spuštění hledání.
 *
 * Sken se nespouští při otevření stránky — každý průchod stojí kvótu
 * u poskytovatele kurzů a pouhé prohlížení by ji vyčerpalo. Stránka
 * čte poslední uložený výsledek, novy si vyžádá až tohle tlačítko.
 */
export async function POST() {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  const started = Date.now();

  try {
    const scan = await scanForValue();
    const db = serviceClient();

    if (scan.candidates.length > 0) {
      const { error } = await db.from("candidates").insert(
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
          band: bandFor(c.offeredOdds).key,
          status: c.blocked ? "rejected" : "pending",
          blocked_reason: c.blocked ?? null,
        }))
      );
      if (error) console.error("[run] zápis kandidátů:", error);
    }

    await db.from("engine_runs").insert({
      scanned: scan.scannedMatches,
      found: scan.candidates.length,
      auto_sent: 0,
      awaiting: scan.candidates.filter((c) => !c.blocked).length,
      tickets: 0,
    });

    return NextResponse.json({
      ok: true,
      provider: scan.provider,
      live: scan.live,
      matches: scan.scannedMatches,
      books: scan.scannedBooks,
      found: scan.candidates.length,
      leaguesAvailable: scan.leaguesAvailable,
      leaguesScanned: scan.leaguesScanned,
      ms: Date.now() - started,
    });
  } catch (err) {
    console.error("[run] selhání:", err);
    return NextResponse.json({ error: "Hledání selhalo." }, { status: 500 });
  }
}
