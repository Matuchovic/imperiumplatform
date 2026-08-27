import { serviceClient } from "@/lib/supabase/server";
import { VETY, klicNahravky, type Vysloveni } from "./vety";
import { log } from "@/lib/log";

/**
 * Hlas z ElevenLabs.
 *
 * Každá věta se vygeneruje jednou a uloží do úložiště. Podruhé
 * se jen přehraje — služba účtuje za znaky a stokrát vyslovit
 * totéž by byla zbytečná útrata.
 *
 * Server only. Klíč nesmí do prohlížeče.
 */

const BUCKET = "hlas";

/**
 * Vybraný hlas se bere z databáze, ne z prostředí.
 *
 * Měnit ho po každém poslechu přes Vercel a čekat na nasazení
 * by bylo nepoužitelné. Proměnná zůstává jako výchozí hodnota.
 */
async function vybranyHlas(): Promise<{ id: string; model: string } | null> {
  const db = serviceClient();
  const { data } = await db.from("hlas_nastaveni").select("hlas_id, model").eq("id", 1)
    .maybeSingle<{ hlas_id: string | null; model: string }>();

  const id = data?.hlas_id || process.env.ELEVENLABS_HLAS;
  if (!id) return null;
  return { id, model: data?.model ?? "eleven_multilingual_v2" };
}

export const hlasPripraven = (): boolean => Boolean(process.env.ELEVENLABS_API_KEY);

/** Odkaz na nahrávku. Vygeneruje ji, když ještě neexistuje. */
export async function odkazNaVetu(v: Vysloveni): Promise<string | null> {
  if (!hlasPripraven()) return null;

  const volba = await vybranyHlas();
  if (!volba) return null;

  const hlas = volba.id;
  const klic = klicNahravky(v, hlas);
  const db = serviceClient();

  // Nahrávka platí rok. Text ani hlas se nemění, jen klíč.
  const { data: uz } = await db.storage.from(BUCKET).createSignedUrl(klic, 31_536_000);
  if (uz?.signedUrl) return uz.signedUrl;

  const zvuk = await vygeneruj(VETY[v], hlas, volba.model);
  if (!zvuk) return null;

  const { error } = await db.storage.from(BUCKET)
    .upload(klic, zvuk, { contentType: "audio/mpeg", upsert: true });

  if (error) {
    log("error", "hlas", "uložení selhalo", { error: error.message });
    return null;
  }

  const { data: novy } = await db.storage.from(BUCKET).createSignedUrl(klic, 31_536_000);
  return novy?.signedUrl ?? null;
}

export async function vygeneruj(
  text: string,
  hlas: string,
  model = "eleven_multilingual_v2"
): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${hlas}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          // Vyšší stabilita drží stejný tón napříč větami. U upozornění
          // je jednotnost důležitější než výraz.
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
      // Generování trvá vteřiny. Delší čekání znamená, že něco nesedí.
      signal: AbortSignal.timeout(15_000),
    });

    if (!r.ok) {
      log("error", "hlas", "generování selhalo", {
        stav: r.status,
        detail: (await r.text()).slice(0, 200),
      });
      return null;
    }

    return await r.arrayBuffer();
  } catch (err) {
    log("error", "hlas", "spojení selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Seznam hlasů k výběru. */
export type Hlas = {
  id: string; nazev: string; popis: string;
  cesky: boolean; zakladni: boolean; ukazka: string | null;
};

export async function dostupneHlasy(): Promise<Hlas[]> {
  if (!process.env.ELEVENLABS_API_KEY) return [];

  try {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];

    const d = await r.json();
    /**
     * Jazyky u hlasu.
     *
     * Hlas trénovaný na češtině zní líp než anglický, který
     * češtinu jen zvládá — to je ten rozdíl, který je slyšet.
     */
    return ((d.voices ?? []) as {
      voice_id: string;
      name: string;
      category?: string;
      labels?: Record<string, string>;
      verified_languages?: { language: string }[];
      preview_url?: string;
    }[]).map((h) => ({
      id: h.voice_id,
      nazev: h.name,
      popis: [h.labels?.accent, h.labels?.description].filter(Boolean).join(" · "),
      cesky: (h.verified_languages ?? []).some((j) => j.language === "cs"),
      /**
       * Na free plánu jdou přes API jen základní hlasy.
       *
       * Hlas z knihovny vypadá v seznamu stejně, ale vrátí 402.
       * Rozlišení proto musí být vidět dřív, než ho někdo vybere.
       */
      zakladni: h.category === "premade",
      ukazka: h.preview_url ?? null,
    }));
  } catch {
    return [];
  }
}
