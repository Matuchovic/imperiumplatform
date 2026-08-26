import { katalog, najdiNastroj } from "./nastroje";
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
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

export type Odpoved = {
  text: string;
  nastroj: string | null;
  sekce: string | null;
  data: unknown;
  degradovano: boolean;
};

async function groq(system: string, user: string, json = false): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  return throughCircuit(async () => {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: json ? 0 : 0.3,
        max_tokens: 700,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return (d?.choices?.[0]?.message?.content as string) ?? null;
  });
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
- Nedoporučuj sázky. Na dotazy typu „na co vsadit" odpověz, že doporučení
  vzniká z výpočtu a schválení člověkem, ne z rozhovoru.
- Piš věcně, bez oslovení a bez nadšených přívlastků.`;

export async function zeptejSe(dotaz: string): Promise<Odpoved> {
  const prazdna: Odpoved = { text: "", nastroj: null, sekce: null, data: null, degradovano: false };

  // Dotaz je vstup od uživatele, ne pokyn systému.
  const bezpecny = asUntrusted("dotaz", dotaz);

  const vyber = await groq(
    VYBER,
    `Nabídka nástrojů:\n${JSON.stringify(katalog())}\n\n${bezpecny}`,
    true
  );

  if (!vyber) {
    return { ...prazdna, degradovano: true,
      text: "Jazykový model teď není dostupný. Data v systému fungují dál — zkus to za chvíli." };
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
  };
}
