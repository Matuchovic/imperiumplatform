/**
 * Vyhodnocení podmínek automatizace.
 *
 * Deklarativní struktura, žádné spouštění kódu z databáze. Kdyby se
 * podmínka ukládala jako výraz a vyhodnocovala přes eval, byl by to
 * způsob, jak si do systému pustit cizí kód přes tabulku.
 */

export type Op = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains" | "exists";

export type Leaf = { field: string; op: Op; value?: unknown };
export type Node = Leaf | { all: Node[] } | { any: Node[] } | { not: Node };

export type Context = Record<string, unknown>;

/** Čte i vnořená pole zápisem "ticket.profit". */
export function readField(ctx: Context, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, ctx);
}

function compare(actual: unknown, op: Op, expected: unknown): boolean {
  switch (op) {
    case "exists": return actual !== undefined && actual !== null;
    case "eq": return actual === expected;
    case "ne": return actual !== expected;
    case "in": return Array.isArray(expected) && expected.includes(actual);
    case "contains":
      if (Array.isArray(actual)) return actual.includes(expected);
      if (typeof actual === "string" && typeof expected === "string") return actual.includes(expected);
      return false;
    case "gt": case "gte": case "lt": case "lte": {
      // Porovnání jen mezi čísly. Nedefinovaná hodnota nikdy neprojde —
      // chybějící údaj nesmí podmínku splnit náhodou.
      const a = Number(actual), b = Number(expected);
      if (!isFinite(a) || !isFinite(b)) return false;
      if (op === "gt") return a > b;
      if (op === "gte") return a >= b;
      if (op === "lt") return a < b;
      return a <= b;
    }
  }
}

export function evaluate(node: Node | null | undefined, ctx: Context): boolean {
  // Bez podmínky automatizace běží — trigger je podmínka sám o sobě.
  if (!node) return true;

  if ("all" in node) return node.all.every((n) => evaluate(n, ctx));
  if ("any" in node) return node.any.some((n) => evaluate(n, ctx));
  if ("not" in node) return !evaluate(node.not, ctx);

  return compare(readField(ctx, node.field), node.op, node.value);
}

/** Ověření tvaru z databáze. Nevalidní podmínka nesmí projít jako true. */
export function isValidNode(value: unknown): value is Node {
  if (typeof value !== "object" || value === null) return false;
  const n = value as Record<string, unknown>;

  if ("all" in n || "any" in n) {
    const list = (n.all ?? n.any) as unknown;
    return Array.isArray(list) && list.length > 0 && list.every(isValidNode);
  }
  if ("not" in n) return isValidNode(n.not);

  return typeof n.field === "string" && typeof n.op === "string" &&
    ["eq","ne","gt","gte","lt","lte","in","contains","exists"].includes(n.op as string);
}
