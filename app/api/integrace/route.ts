import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { overSpojeni as overFakturoid } from "@/lib/integrace/fakturoid";
import { overSpojeni as overStripe } from "@/lib/integrace/stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Stav napojení. Ověřuje se skutečným voláním, ne přítomností proměnné. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const [fakturoid, stripe] = await Promise.all([overFakturoid(), overStripe()]);
  return NextResponse.json({ fakturoid, stripe });
}
