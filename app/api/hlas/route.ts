import { NextResponse } from "next/server";
import { roleOf } from "@/lib/auth/guard";
import { VETY, type Vysloveni } from "@/lib/hlas/vety";
import { odkazNaVetu, hlasPripraven, dostupneHlasy } from "@/lib/hlas/elevenlabs";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Odkazy na namluvené věty.
 *
 * Prohlížeč si je stáhne jednou a dál přehrává z paměti. Klíč
 * k ElevenLabs zůstává na serveru.
 */
export async function GET(req: Request) {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  if (!hlasPripraven()) {
    return NextResponse.json({
      pripraven: false,
      duvod: "Chybí ELEVENLABS_API_KEY nebo ELEVENLABS_HLAS v prostředí.",
      odkazy: {},
    });
  }

  const u = new URL(req.url);

  // Výpis hlasů k výběru, ne k přehrávání.
  if (u.searchParams.get("hlasy") === "1") {
    return NextResponse.json({ pripraven: true, hlasy: await dostupneHlasy() });
  }

  const co = u.searchParams.get("co");
  const chtene = co && co in VETY
    ? [co as Vysloveni]
    : (Object.keys(VETY) as Vysloveni[]);

  /**
   * Všechny věty najednou.
   *
   * První volání je pomalé, protože se generují. Další už jen
   * sáhnou do úložiště.
   */
  const dvojice = await Promise.all(
    chtene.map(async (v) => [v, await odkazNaVetu(v)] as const)
  );

  const odkazy: Record<string, string> = {};
  for (const [v, url] of dvojice) if (url) odkazy[v] = url;

  return NextResponse.json({ pripraven: true, odkazy });
}
