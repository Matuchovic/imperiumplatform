import { NextResponse } from "next/server";
import { settleOpenTickets } from "@/lib/engine/settle";
import { newRunId } from "@/lib/log";
import { withLock } from "@/lib/jobs/lock";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Zúčtování. Bez parametru běží naostro, s ?dry=1 jen spočítá plán.
 *
 * Nasucho jde pustit vždycky — právě proto, aby šel řetězec ověřit
 * dřív, než se zapne vypínač a přijdou skutečné výsledky.
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get("dry") === "1";

  try {
    const runId = newRunId();

    // Nasucho zámek nepotřebuje — nic nezapisuje.
    if (dryRun) {
      return NextResponse.json(await settleOpenTickets({ dryRun: true, runId }));
    }

    const result = await withLock("settle", runId, () =>
      settleOpenTickets({ dryRun: false, runId })
    );

    if (result === null) {
      return NextResponse.json({ ok: true, skipped: "Zúčtování už běží." });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[settle] selhání:", err);
    return NextResponse.json({ error: "Zúčtování selhalo." }, { status: 500 });
  }
}

// Vercel spouští cron metodou GET. POST zůstává pro ruční spuštění.
export const GET = run;
export const POST = run;
