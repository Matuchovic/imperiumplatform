/**
 * Peněžní matematika. Žádné závislosti — čisté funkce.
 *
 * Odděleno od přístupu k databázi schválně: doménová logika musí jít
 * otestovat bez Supabase. Test na to upozornil hned, jak vzniknul.
 */

export type EntryKind =
  | "deposit"      // vklad klienta
  | "withdrawal"   // výběr
  | "stake"        // vsazeno, záporné
  | "payout"       // vyplaceno, kladné
  | "refund"       // zrušená sázka
  | "correction";  // ruční oprava, vždy s důvodem

export type BetState = "won" | "lost" | "void" | "push";

export const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Kolik se vyplácí při zúčtování.
 *
 * Vklad se odečetl už při vsazení, takže výhra vrací celý obrat,
 * prohra nevrací nic a zrušená sázka vrací vklad.
 */
export function payoutFor(state: BetState, stake: number, odds: number): number {
  if (!isFinite(stake) || stake <= 0) return 0;
  if (!isFinite(odds) || odds <= 1) return state === "won" ? 0 : round2(stake);

  switch (state) {
    case "won": return round2(stake * odds);
    case "void":
    case "push": return round2(stake);
    case "lost": return 0;
  }
}

/** Zisk z tiketu, tedy výplata minus vklad. */
export function profitFor(state: BetState, stake: number, odds: number): number {
  if (!isFinite(stake) || stake <= 0) return 0;
  return round2(payoutFor(state, stake, odds) - stake);
}

/** Zůstatek je součet knihy, ne uložená hodnota. */
export const sumEntries = (amounts: number[]) =>
  round2(amounts.reduce((s, x) => s + (isFinite(x) ? x : 0), 0));

/**
 * Klíče pohybů. Tvar rozhoduje o tom, co se nesmí zapsat dvakrát —
 * na tom stojí celá idempotence.
 */
export const keys = {
  stake: (ticketId: string) => `stake:${ticketId}`,
  payout: (ticketId: string) => `payout:${ticketId}`,
  refund: (ticketId: string) => `refund:${ticketId}`,
  deposit: (userId: string, at: string) => `deposit:${userId}:${at}`,
  correction: (userId: string, ref: string) => `correction:${userId}:${ref}`,
};
