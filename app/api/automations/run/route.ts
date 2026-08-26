import { NextResponse } from "next/server";
import { runAutomations } from "@/lib/automations/engine";
import { withLock } from "@/lib/jobs/lock";
import { newRunId } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  const runId = newRunId();

  try {
    if (dryRun) {
      return NextResponse.json(await runAutomations({ dryRun: true, runId }));
    }

    const result = await withLock("automations", runId, () =>
      runAutomations({ dryRun: false, runId })
    );

    if (result === null) {
      return NextResponse.json({ ok: true, skipped: "Automatizace už běží." });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[automations] selhání:", err);
    return NextResponse.json({ error: "Běh selhal." }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
