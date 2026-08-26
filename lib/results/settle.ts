import type { MatchResult, SettlementOutcome } from "./base";

/**
 * Deterministické vyhodnocení sázky.
 *
 * Bez výsledku se nic nezúčtuje — otevřený tiket je vždycky lepší
 * než vymyšlený výsledek.
 */

export type Bet = {
  market: string;
  selection: string;
};

/** Zápas, který neskončil, se nezúčtovává. */
export function settleBet(bet: Bet, result: MatchResult): SettlementOutcome {
  if (result.status === "cancelled" || result.status === "postponed") return "void";
  if (result.status !== "finished") return "undecided";
  if (result.homeScore === null || result.awayScore === null) return "undecided";

  const h = result.homeScore;
  const a = result.awayScore;
  const total = h + a;
  const sel = bet.selection.trim().toUpperCase();
  const market = bet.market.trim().toUpperCase();

  // 1X2 a dvojtipy
  if (market === "1X2" || market === "H2H" || market === "ML") {
    if (sel === "1" || sel === "HOME") return h > a ? "won" : "lost";
    if (sel === "2" || sel === "AWAY") return a > h ? "won" : "lost";
    if (sel === "X" || sel === "DRAW") return h === a ? "won" : "lost";
    if (sel === "1X") return h >= a ? "won" : "lost";
    if (sel === "X2") return a >= h ? "won" : "lost";
    if (sel === "12") return h !== a ? "won" : "lost";
  }

  // Počet gólů nad/pod
  const ou = sel.match(/^([OU])\s*([\d.]+)$/) ?? sel.match(/^(OVER|UNDER)\s*([\d.]+)$/);
  if (ou) {
    const line = Number(ou[2]);
    if (!isFinite(line)) return "undecided";
    if (total === line) return "push";      // celá čára, vklad zpět
    const over = ou[1].startsWith("O");
    return (over ? total > line : total < line) ? "won" : "lost";
  }

  // Oba týmy skórují
  if (market === "BTTS" || sel === "BTTS") {
    const both = h > 0 && a > 0;
    if (sel === "NO" || sel === "BTTS NO") return both ? "lost" : "won";
    return both ? "won" : "lost";
  }

  // Neznámý trh raději nechat člověku než hádat.
  return "undecided";
}
