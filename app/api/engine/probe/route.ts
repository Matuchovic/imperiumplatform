import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers/odds";

export const dynamic = "force-dynamic";

/**
 * Vrátí syrovou odpověď poskytovatele pro jednu ligu.
 * Slouží k ověření, že mapování polí v adaptéru sedí — jinak
 * bys ladil naslepo. Chráněno stejným tajemstvím jako sken.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret) {
    return NextResponse.json({ error: "Chybí CRON_SECRET." }, { status: 503 });
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 401 });
  }

  const league = new URL(req.url).searchParams.get("league") ?? "EPL";
  const provider = getProvider();

  if (!provider.probe) {
    return NextResponse.json(
      { provider: provider.name, error: "Tenhle adaptér probe nepodporuje." },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json({ provider: provider.name, league, raw: await provider.probe(league) });
  } catch (err) {
    return NextResponse.json(
      { provider: provider.name, league, error: String(err) },
      { status: 502 }
    );
  }
}
