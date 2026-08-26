import { katalog, najdiNastroj, type Navigace, type Navrh } from "./nastroje";
import { asUntrusted, validateShape, numbersAreGrounded } from "@/lib/ai/safe";
import { throughCircuit } from "@/lib/ai/circuit";
import { log } from "@/lib/log";

/**
 * Jádro asistenta.
 *
 * Dva kroky: model vybere nástroj, databáze vrátí data, model je
 * převypráví. Mezi tím se ověří, že v odpovědi není číslo, které
 * ve zdroji nebylo.
 *
 * Když model selže, vrátí se aspoň surová data — degradovaný režim
 * je lepší než prázdná obrazovka.
 */

const URL = "https://api.groq.com/openai/v1/chat/completions";
/**
 * Modely v pořadí, v jakém se zkoušejí.
 *
 * Groq modely pravidelně vyřazuje — llama-3.3-70b-versatile skončila
 * 16. srpna 2026. Jediná hodnota natvrdo znamená, že příští vyřazení
 * zase položí asistenta. Proto záložní pořadí.
 */
const MODELY = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
].filter(Boolean) as string[];

export type Odpoved = {
  text: string;
  nastroj: string | null;
  sekce: string | null;
  data: unknown;
  degradovano: boolean;
  /** Kam přepnout a s jakými filtry. */
  navigace: Navigace | null;
  /** Riziková akce čekající na kliknutí člověka. */
  navrh: Navrh | null;
  /** Odpověď obsahuje data z webu, ne jen z naší databáze. */
  zWebu: boolean;
};

/** Poslední důvod selhání. Aby se nemuselo hádat z logu. */
export let posledniDuvod: string | null = null;

async function groq(system: string, user: string, json = false): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    posledniDuvod = "GROQ_API_KEY není v prostředí — proměnná chybí nebo od jejího přidání neproběhl deploy.";
    return null;
  }

  return throughCircuit(async () => {
    // Vyřazený model vrátí 404. Zkusí se další v pořadí místo
    // toho, aby asistent rovnou zmlkl.
    for (const model of MODELY) {
      const vysledek = await zkusModel(model, system, user, json, key);
      if (vysledek !== "DALSI") return vysledek;
    }
    return null;
  });
}

async function zkusModel(
  model: string, system: string, user: string, json: boolean, key: string
): Promise<string | null | "DALSI"> {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: json ? 0 : 0.3,
      max_tokens: 700,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    // Groq vrací důvod v těle. Bez něj se hádá mezi vyřazeným
    // modelem, špatným klíčem a nepodporovaným formátem.
    const telo = await res.text().catch(() => "");
    let zprava = telo.slice(0, 200);
    try {
      const j = JSON.parse(telo);
      zprava = j?.error?.message ?? j?.error?.code ?? zprava;
    } catch { /* tělo není JSON, stačí useknutý text */ }

    posledniDuvod = `Groq odpověděl ${res.status}: ${zprava}`;
    log("warn", "asistent", "model nedostupný, zkouším další", {
      stav: res.status, model, jsonRezim: json, zprava,
    });

    // 404 nebo vyřazení = zkusit další. Jiná chyba je skutečná
    // závada a přeskakování by ji jen zamaskovalo.
    const vyrazeny = res.status === 404 || /decommission|does not exist/i.test(zprava);
    return vyrazeny ? "DALSI" : null;
  }

  posledniDuvod = null;
  const d = await res.json();
  return (d?.choices?.[0]?.message?.content as string) ?? null;
}

const VYBER = `Jsi směrovač dotazů v systému BETIMPERIUM.
Z nabídky vyber JEDEN nástroj, který na dotaz odpoví, a doplň jeho parametry.
Odpověz výhradně JSON objektem: {"klic": "...", "parametry": {...}}.
Když žádný nástroj nesedí, vrať {"klic": "zadny", "parametry": {}}.
Nikdy nevymýšlej klíče, které nejsou v nabídce.`;

const SHRNUTI = `Jsi asistent v systému BETIMPERIUM pro správu sázkového poradenství.
Dostaneš data z databáze a stručně je převyprávíš česky, ve dvou až čtyřech větách.

PRAVIDLA:
- Používej VÝHRADNĚ čísla z dodaných dat. Nic nedopočítávej ani neodhaduj.
- Když jsou v datech intervaly nebo poznámky o velikosti vzorku, zmiň je.
- Když data pocházejí z webu (pole zdroj: "web"), napiš to. Vlastní databázi
  a veřejný rejstřík nemíchej do jedné věty bez rozlišení.
- Nedoporučuj sázky. Na dotazy typu „na co vsadit" odpověz, že doporučení
  vzniká z výpočtu a schválení člověkem, ne z rozhovoru.
- Piš věcně, bez oslovení a bez nadšených přívlastků.`;

export async function zeptejSe(dotaz: string): Promise<Odpoved> {
  const prazdna: Odpoved = {
    text: "", nastroj: null, sekce: null, data: null,
    degradovano: false, navigace: null, navrh: null, zWebu: false,
  };

  // Dotaz je vstup od uživatele, ne pokyn systému.
  const bezpecny = asUntrusted("dotaz", dotaz);

  const vyber = await groq(
    VYBER,
    `Nabídka nástrojů:\n${JSON.stringify(katalog())}\n\n${bezpecny}`,
    true
  );

  if (!vyber) {
    return { ...prazdna, degradovano: true,
      text: posledniDuvod
        ? `Model neodpověděl. ${posledniDuvod}`
        : "Model neodpověděl a nevrátil důvod. Nejspíš je otevřený circuit breaker po předchozích selháních — zkus to za pět minut." };
  }

  let volba: { klic?: string; parametry?: Record<string, string> } | null = null;
  try { volba = JSON.parse(vyber); } catch { volba = null; }

  const tvar = validateShape<{ klic: string }>(volba, { klic: "string" });
  if (!tvar || tvar.klic === "zadny") {
    return { ...prazdna,
      text: "Na tohle nemám nástroj. Umím přehled provozu, výkonnost, klienty k řešení, detail klienta, rozpad pásem, stav motoru a hledání v kontaktech." };
  }

  const nastroj = najdiNastroj(tvar.klic);
  if (!nastroj) {
    log("warn", "asistent", "model vybral neznámý nástroj", { klic: tvar.klic });
    return { ...prazdna, text: "Vybraný nástroj neexistuje. Zkus otázku jinak." };
  }

  let data: unknown;
  try {
    data = await nastroj.spust(volba?.parametry ?? {});
  } catch (err) {
    log("error", "asistent", "nástroj selhal", {
      klic: nastroj.klic, error: err instanceof Error ? err.message : String(err),
    });
    return { ...prazdna, nastroj: nastroj.klic,
      text: "Dotaz do databáze selhal. Zkus to prosím znovu." };
  }

  // Navigace a návrhy nesou strukturu, ne text — vytáhnou se rovnou.
  const obal = (data ?? {}) as Record<string, unknown>;
  const navigace = (obal.navigace as Navigace | undefined) ?? null;
  const navrh = (obal.navrh as Navrh | undefined) ?? null;
  const zWebu = obal.zdroj === "web";

  // U navigace nemá smysl volat model podruhé — cíl je jednoznačný.
  if (navigace) {
    return {
      ...prazdna,
      text: (obal.popis as string) ?? "Přepínám.",
      nastroj: nastroj.klic, sekce: navigace.sekce, data, navigace,
    };
  }

  const shrnuti = await groq(SHRNUTI, `Dotaz: ${dotaz}\n\nData:\n${JSON.stringify(data)}`);

  // Vymyšlené číslo je tady nejdražší možná chyba — člověk ho přečte
  // jako fakt. Raději ukázat surová data než nepravdivou větu.
  const ok = shrnuti && numbersAreGrounded(shrnuti, data);
  if (shrnuti && !ok) {
    log("warn", "asistent", "shrnutí obsahovalo číslo mimo zdroj", { klic: nastroj.klic });
  }

  return {
    text: ok ? shrnuti : "Data jsou níž. Shrnutí se nepodařilo ověřit, tak ho raději neukazuju.",
    nastroj: nastroj.klic,
    sekce: nastroj.sekce ?? null,
    data,
    degradovano: !ok,
    navigace: null,
    navrh,
    zWebu,
  };
}
