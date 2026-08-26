/**
 * Hranice mezi daty a instrukcemi.
 *
 * Externí text — zprávy od klientů, názvy kanceláří, metadata trhů —
 * je vždycky DATA. Nikdy nesmí změnit oprávnění, systémový prompt
 * ani povolené nástroje.
 */

/**
 * Obalí nedůvěryhodný text tak, aby bylo v promptu jednoznačné,
 * kde končí instrukce a kde začíná cizí obsah.
 */
export function asUntrusted(label: string, text: string): string {
  const clean = text.replace(/\u0000/g, "").slice(0, 4000);
  return `<${label} untrusted="true">\n${clean}\n</${label}>`;
}

/**
 * Ověří strukturu výstupu. Když model vrátí něco jiného, než se čeká,
 * neprovede se žádná akce — raději nic než akce na základě zmatku.
 */
export type Shape = Record<string, "string" | "number" | "boolean" | "string[]">;

export function validateShape<T>(value: unknown, shape: Shape): T | null {
  if (typeof value !== "object" || value === null) return null;
  const obj = value as Record<string, unknown>;

  for (const [key, kind] of Object.entries(shape)) {
    const v = obj[key];
    if (kind === "string[]") {
      if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) return null;
    } else if (typeof v !== kind) {
      return null;
    }
  }
  return obj as T;
}

/**
 * Každé číslo ve výstupu musí pocházet ze vstupu.
 *
 * V systému, kde se mluví o penězích a kurzech, je vymyšlené číslo
 * nejdražší možná chyba — člověk ho přečte jako fakt.
 */
export function numbersAreGrounded(output: string, input: unknown): boolean {
  const known = new Set(
    JSON.stringify(input).match(/\d+(?:[.,]\d+)?/g)?.map((n) => n.replace(",", ".")) ?? []
  );
  const used = output.match(/\d+(?:[.,]\d+)?/g) ?? [];

  for (const raw of used) {
    const n = raw.replace(",", ".");
    if (known.has(n)) continue;
    // Malá celá čísla bývají výčty ("tři kanceláře"), ne údaje.
    if (Number.isInteger(Number(n)) && Number(n) <= 12) continue;
    return false;
  }
  return true;
}
