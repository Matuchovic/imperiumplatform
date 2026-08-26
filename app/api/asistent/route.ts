import { NextResponse } from "next/server";
import { zeptejSe } from "@/lib/asistent/jadro";
import { REZIMY, type Rezim } from "@/lib/asistent/nastroje";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { newRunId, log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Asistent je pro tým, ne pro klienty. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let body: { dotaz?: string; rezim?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const dotaz = (body.dotaz ?? "").trim().slice(0, 500);
  if (!dotaz) return NextResponse.json({ error: "Prázdný dotaz." }, { status: 400 });

  // Neznámý režim spadne na ask — nejužší oprávnění, ne nejširší.
  const rezim = (REZIMY.some((r) => r.klic === body.rezim) ? body.rezim : "ask") as Rezim;

  const runId = newRunId();
  const start = Date.now();

  try {
    const odpoved = await zeptejSe(dotaz, rezim);
    log("info", "asistent", "dotaz zpracován", {
      runId, rezim, nastroj: odpoved.nastroj, ms: Date.now() - start, degradovano: odpoved.degradovano,
    });
    return NextResponse.json(odpoved);
  } catch (err) {
    log("error", "asistent", "selhání", {
      runId, error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Asistent selhal." }, { status: 500 });
  }
}
