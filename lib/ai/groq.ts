/**
 * Groq — jazykové úlohy. Rychlá inference se hodí na věci, které běží
 * v pracovním postupu a nesmí zdržet: rozpoznání volného textu,
 * párování názvů, návrh zprávy.
 *
 * Model NIKDY nepočítá kurzy, hodnotu ani sázky. To dělá lib/engine.
 */

import { log } from "@/lib/log";

const URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

export function groqReady(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

type Msg = { role: "system" | "user"; content: string };

async function chat(messages: Msg[], maxTokens = 700): Promise<string | null> {
  if (!groqReady()) return null;
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error("[groq]", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[groq] výpadek:", err);
    return null;
  }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim()) as T;
  } catch (err) {
    // Volající null zpracuje — ale tichá chyba by skryla, že model
    // vrací nevalidní JSON systematicky.
    log("debug", "groq", "výstup není platný JSON", { error: String(err) });
    return null;
  }
}

/* ---------- 1. rychlé zadání tiketu z volného textu ---------- */

export type ParsedTicket = {
  home: string; away: string; market: string;
  odds: number; units: number; book: string;
};

export async function parseTicketLine(line: string): Promise<ParsedTicket | null> {
  const out = await chat([
    {
      role: "system",
      content:
        "Jsi parser sázkových tiketů. Z českého volného textu vytáhni údaje a vrať POUZE JSON " +
        '{"home":"","away":"","market":"","odds":0,"units":0,"book":""}. ' +
        "market opiš doslova (např. O 2.5, 1X, BTTS, AH -0.5). odds je desetinný kurz. " +
        "units je počet jednotek. book je sázková kancelář. Nic nedopočítávej ani nehádej: " +
        "co v textu není, nech prázdné nebo 0.",
    },
    { role: "user", content: line },
  ], 300);

  const p = parseJson<ParsedTicket>(out);
  if (!p || !p.home || !p.away) return null;
  // Model nesmí určovat čísla mimo rozsah — kontrola je na naší straně.
  if (!(p.odds > 1 && p.odds < 100)) return null;
  if (!(p.units >= 0 && p.units <= 20)) return null;
  return p;
}

/* ---------- 2. párování názvů týmů napříč poskytovateli ---------- */

export async function matchTeamNames(
  unknown: string,
  candidates: string[]
): Promise<string | null> {
  if (candidates.length === 0) return null;
  const out = await chat([
    {
      role: "system",
      content:
        'Přiřaď název týmu k nejbližšímu ze seznamu. Vrať POUZE JSON {"match":"","confidence":0}. ' +
        "confidence je 0 až 1. Když si nejsi jistý nad 0.8, vrať prázdný match.",
    },
    { role: "user", content: JSON.stringify({ unknown, candidates }) },
  ], 120);

  const p = parseJson<{ match: string; confidence: number }>(out);
  if (!p || !p.match || p.confidence < 0.8) return null;
  return candidates.includes(p.match) ? p.match : null;
}

/* ---------- 3. podklad manažera k hovoru ---------- */

export type Briefing = {
  situace: string;
  pozor: string[];
  nabidnout: string[];
  otvirak: string;
};

export async function clientBriefing(facts: Record<string, unknown>): Promise<Briefing | null> {
  const out = await chat([
    {
      role: "system",
      content:
        "Jsi asistent manažera sázkového poradenství. Dostaneš SPOČÍTANÁ fakta o jednom klientovi. " +
        "Nic nepočítej a nevymýšlej žádná čísla — smíš použít jen ta, která jsou ve vstupu. " +
        'Vrať POUZE JSON {"situace":"","pozor":[],"nabidnout":[],"otvirak":""}. ' +
        "Česky, věcně, bez marketingu. Nikdy nedoporučuj konkrétní sázku ani velikost vkladu.",
    },
    { role: "user", content: JSON.stringify(facts) },
  ], 800);

  const b = parseJson<Briefing>(out);
  if (!b || !b.situace) return null;
  return validateNumbers(b, facts) ? b : null;
}

/**
 * Každé číslo ve výstupu musí pocházet ze vstupu.
 *
 * V hovoru o penězích je vymyšlená částka nejdražší možná chyba —
 * manažer ji přečte klientovi jako fakt. Deset řádků kódu, které
 * tuhle třídu selhání vylučují.
 */
function validateNumbers(b: Briefing, facts: Record<string, unknown>): boolean {
  const text = [b.situace, b.otvirak, ...b.pozor, ...b.nabidnout].join(" ");
  const known = new Set(
    JSON.stringify(facts)
      .match(/\d+(?:[.,]\d+)?/g)
      ?.map((n) => n.replace(",", ".")) ?? []
  );
  const used = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  for (const raw of used) {
    const n = raw.replace(",", ".");
    if (known.has(n)) continue;
    // Malá celá čísla bývají výčty ("tři prohry"), ne údaje o penězích.
    if (Number(n) <= 12 && Number.isInteger(Number(n))) continue;
    console.warn("[groq] briefing obsahuje neznámé číslo:", raw);
    return false;
  }
  return true;
}
