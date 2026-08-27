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
/** Uložení vybraného hlasu. */
export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  let b: { hlas_id?: string; hlas_nazev?: string; model?: string };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const { serviceClient } = await import("@/lib/supabase/server");
  const db = serviceClient();

  const { error } = await db.from("hlas_nastaveni").upsert({
    id: 1,
    hlas_id: String(b.hlas_id ?? "").trim() || null,
    hlas_nazev: String(b.hlas_nazev ?? "").trim() || null,
    model: ["eleven_multilingual_v2", "eleven_turbo_v2_5", "eleven_flash_v2_5"]
      .includes(String(b.model)) ? b.model : "eleven_multilingual_v2",
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

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
    const { serviceClient } = await import("@/lib/supabase/server");
    const db = serviceClient();
    const [hlasy, { data: volba }] = await Promise.all([
      dostupneHlasy(),
      db.from("hlas_nastaveni").select("hlas_id, model").eq("id", 1)
        .maybeSingle<{ hlas_id: string | null; model: string }>(),
    ]);

    /**
     * Hlasy ověřené pro češtinu nahoru.
     *
     * Anglicky trénovaný hlas češtinu zvládne, ale s přízvukem —
     * a to je přesně ten rozdíl, který je slyšet.
     */
    hlasy.sort((a, b) => Number(b.cesky) - Number(a.cesky) || a.nazev.localeCompare(b.nazev, "cs"));

    return NextResponse.json({
      pripraven: true,
      hlasy,
      vybrany: volba?.hlas_id ?? process.env.ELEVENLABS_HLAS ?? null,
      model: volba?.model ?? "eleven_multilingual_v2",
    });
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
