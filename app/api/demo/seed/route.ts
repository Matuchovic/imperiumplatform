import { NextResponse } from "next/server";
import { seedDemo, wipeDemo, demoCount } from "@/lib/seed/write";
import { requireAdmin } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Kolik ukázkových klientů je v systému. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }
  return NextResponse.json({ demoClients: await demoCount() });
}

/** Naplní databázi ukázkovými daty. Jen admin. */
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const url = new URL(req.url);
  const count = Math.min(30, Math.max(1, Number(url.searchParams.get("clients") ?? 12)));
  const seed = Number(url.searchParams.get("seed") ?? 42);

  // Ukázka se nepřidává k existující — jinak by po pár spuštěních
  // vznikly stovky klientů a nikdo by nevěděl, co je co.
  if ((await demoCount()) > 0) {
    return NextResponse.json(
      { error: "Ukázková data už existují. Nejdřív je smaž (DELETE)." },
      { status: 409 }
    );
  }

  try {
    return NextResponse.json(await seedDemo(count, seed));
  } catch (err) {
    console.error("[seed]", err);
    return NextResponse.json({ error: "Zápis selhal." }, { status: 500 });
  }
}

/** Smaže ukázková data. Skutečných klientů se nedotkne. */
export async function DELETE() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }
  try {
    return NextResponse.json(await wipeDemo());
  } catch (err) {
    console.error("[seed] mazání", err);
    return NextResponse.json({ error: "Mazání selhalo." }, { status: 500 });
  }
}
