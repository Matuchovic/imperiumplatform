import { NextResponse } from "next/server";
import { scanForValue } from "@/lib/engine/scan";
import { posliVsemVTymu } from "@/lib/push/posli";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Endpoint pro Vercel Cron. Chráněný sdíleným tajemstvím — bez něj
 * by kdokoliv mohl protáčet placenou kvótu poskytovatele kurzů.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret) {
    return NextResponse.json(
      { error: "Chybí CRON_SECRET. Nastav ho v proměnných prostředí." },
      { status: 503 }
    );
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 401 });
  }

  try {
    const result = await scanForValue();
    console.log(
      `[scan] ${result.provider} · ${result.scannedMatches} zápasů · ${result.candidates.length} kandidátů`
    );
    // Kandidát čeká na rozhodnutí člověka — bez upozornění
    // by tam ležel, dokud si někdo nevzpomene.
    const nalezeno = Number((result as { found?: number })?.found ?? 0);
    if (nalezeno > 0) {
      posliVsemVTymu("kandidati", {
        titulek: "Motor našel příležitost",
        text: nalezeno === 1
          ? "Jeden kandidát čeká na schválení."
          : `${nalezeno} kandidátů čeká na schválení.`,
        url: "/dashboard",
        tag: "kandidati",
      }).catch(() => undefined);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[scan] selhalo:", err);
    return NextResponse.json({ error: "Sken selhal." }, { status: 500 });
  }
}
