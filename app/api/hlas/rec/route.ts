import { roleOf } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Strop délky. Delší odpovědi se čtou líp, než poslouchají. */
const MAX_ZNAKU = 400;

/**
 * Namluví libovolný text.
 *
 * Na rozdíl od pevných vět se odpověď asistenta neopakuje, takže
 * se nedá uložit dopředu. Zvuk se proto streamuje — přehrávání
 * začne dřív, než je celá věta hotová.
 */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me) return new Response("Nepovoleno.", { status: 403 });

  const klic = process.env.ELEVENLABS_API_KEY;
  if (!klic) return new Response("Hlas není nastavený.", { status: 503 });

  let b: { text?: string };
  try { b = await req.json(); }
  catch { return new Response("Neplatný požadavek.", { status: 400 }); }

  const text = String(b.text ?? "").trim().slice(0, MAX_ZNAKU);
  if (!text) return new Response("Prázdný text.", { status: 400 });

  const db = serviceClient();
  const { data: volba } = await db.from("hlas_nastaveni").select("hlas_id, model").eq("id", 1)
    .maybeSingle<{ hlas_id: string | null; model: string }>();

  const hlas = volba?.hlas_id || process.env.ELEVENLABS_HLAS;
  if (!hlas) return new Response("Není vybraný hlas.", { status: 503 });

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${hlas}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": klic,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: volba?.model ?? "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(25_000),
      }
    );

    if (!r.ok || !r.body) {
      /**
       * Důvod od ElevenLabs se posílá dál.
       *
       * Obecné „nepodařilo se" nutí hádat mezi špatným klíčem,
       * neexistujícím hlasem a vyčerpaným kreditem — a to jsou
       * tři různá řešení.
       */
      const detail = await r.text().catch(() => "");
      log("error", "hlas", "stream selhal", { stav: r.status, detail: detail.slice(0, 300) });

      const duvod =
        r.status === 401 ? "Klíč ELEVENLABS_API_KEY je neplatný."
        : r.status === 404 ? `Hlas ${hlas} u ElevenLabs neexistuje.`
        : r.status === 422 ? "Vybraný model nezvládne tenhle text nebo hlas."
        : r.status === 402 ? "Tenhle hlas je z knihovny a free plán ho přes API nepustí. Vyber některý ze základních — v seznamu mají štítek ZÁKLADNÍ."
        : r.status === 429 ? "Vyčerpaný kredit nebo příliš mnoho požadavků."
        : `ElevenLabs vrátil ${r.status}. ${detail.slice(0, 160)}`;

      return new Response(duvod, { status: 502 });
    }

    // Proud se posílá dál, ne až celý soubor.
    return new Response(r.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    log("error", "hlas", "spojení selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response("Spojení selhalo.", { status: 502 });
  }
}
