import { payoutFor, profitFor, type BetState } from "@/lib/bankroll/math";
import { bandFor } from "@/lib/engine/bands";

/**
 * Generátor ukázkových dat.
 *
 * Nejde o čísla natvrdo v rozhraní — vyrábí skutečné řádky, které
 * projdou stejnou matematikou jako ostrý provoz a dají se smazat.
 *
 * Zásadní rozhodnutí: výhoda je 3 %, ne 18 %. Ukázka s ROI +18 %
 * vytvoří u klienta očekávání, které produkt nikdy nesplní, a první
 * ztrátový měsíc pak vypadá jako selhání. Poctivá ukázka je zároveň
 * u informovaného klienta důvěryhodnější.
 */

export const DEMO_EDGE = 0.03;
export const DEMO_TAG = "[ukázka]";

/** Deterministický generátor — stejné semínko dá stejná data. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type DemoTicket = {
  event: string;
  market: string;
  selection: string;
  odds: number;
  stake: number;
  state: BetState | "open";
  profit: number;
  clv: number | null;
  band: string;
  daysAgo: number;
};

export type DemoClient = {
  name: string;
  plan: string;
  startBankroll: number;
  unitPct: number;
  bands: string[];
  telegram: boolean;
  tenureDays: number;
  tickets: DemoTicket[];
};

const TEAMS: [string, string][] = [
  ["Sparta", "Slavia"], ["Plzeň", "Baník"], ["Arsenal", "Chelsea"],
  ["Bayern", "Dortmund"], ["Real Madrid", "Sevilla"], ["Inter", "Milán"],
  ["Kometa", "Třinec"], ["Bruins", "Maple Leafs"], ["Lakers", "Celtics"],
  ["Ajax", "Feyenoord"], ["PSG", "Lyon"], ["Liverpool", "Everton"],
];

const MARKETS: [string, string][] = [
  ["1X2", "1"], ["1X2", "X"], ["1X2", "2"], ["1X2", "1X"],
  ["TOTALS", "O 2.5"], ["TOTALS", "U 2.5"], ["TOTALS", "O 5.5"],
  ["BTTS", "YES"], ["BTTS", "NO"],
];

const NAMES = [
  "Jan Novák", "Petr Svoboda", "Tomáš Dvořák", "Michal Procházka",
  "Martin Kovář", "Lukáš Bílek", "David Horák", "Jakub Marek",
  "Marie Kučerová", "Eva Pospíšilová", "Ondřej Fiala", "Radek Beneš",
];

/** Kurzy, které skutečně padají — víc v nízkých pásmech, míň ve vysokých. */
function drawOdds(r: () => number): number {
  const x = r();
  if (x < 0.35) return 1.4 + r() * 0.3;   // Základ
  if (x < 0.75) return 1.75 + r() * 0.4;  // Standard
  if (x < 0.93) return 2.25 + r() * 0.7;  // Rozšířený
  return 3.1 + r() * 1.4;                 // Odvážný
}

export function generateClient(index: number, seed = 42): DemoClient {
  const r = rng(seed + index * 7919);

  const tenureDays = 20 + Math.floor(r() * 250);
  const startBankroll = [15000, 20000, 25000, 34000, 50000][Math.floor(r() * 5)];
  const unitPct = [1, 1.5, 2, 2.5][Math.floor(r() * 4)];
  const plan = (["start", "pro", "vip"] as const)[Math.floor(r() * 3)];

  const bands = ["zaklad", "standard"];
  if (r() > 0.6) bands.push("rozsireny");
  if (r() > 0.88) bands.push("odvazny");

  // Zhruba jeden tiket na dva až tři dny.
  const count = Math.max(4, Math.floor(tenureDays / (2 + r() * 1.5)));
  const tickets: DemoTicket[] = [];
  let bankroll = startBankroll;

  for (let i = 0; i < count; i++) {
    const odds = Math.round(drawOdds(r) * 100) / 100;
    const band = bandFor(odds);

    if (!bands.includes(band.key)) continue;

    // Férová pravděpodobnost při dané výhodě. Odtud se losuje výsledek —
    // proto ukázka odpovídá tomu, co systém opravdu umí.
    const fairProb = (1 + DEMO_EDGE) / odds;
    const [home, away] = TEAMS[Math.floor(r() * TEAMS.length)];
    const [market, selection] = MARKETS[Math.floor(r() * MARKETS.length)];

    const units = Math.round((0.4 + r() * 2.1) * 10) / 10;
    const stake = Math.round(bankroll * (unitPct / 100) * units);
    if (stake < 50) continue;

    // (i + 1) / count, jinak poslední tiket skončí na tenure/count
    // a nikdy neklesne k nule — otevřené tikety by pak nevznikly.
    const daysAgo = Math.max(0, Math.round(tenureDays * (1 - (i + 1) / count)));
    const open = daysAgo <= 2 && r() > 0.45;

    let state: BetState | "open" = "open";
    let profit = 0;

    if (!open) {
      const draw = r();
      state = draw < 0.02 ? "void" : draw < fairProb + 0.02 ? "won" : "lost";
      profit = profitFor(state as BetState, stake, odds);
      bankroll += profit;
    }

    tickets.push({
      event: `${home} — ${away}`,
      market, selection, odds, stake, state, profit,
      // CLV kolísá kolem malé kladné hodnoty, ne kolem velké.
      clv: open ? null : Math.round((r() * 0.06 - 0.025) * 1000) / 1000,
      band: band.key,
      daysAgo,
    });
  }

  return {
    name: `${NAMES[index % NAMES.length]} ${DEMO_TAG}`,
    plan,
    startBankroll,
    unitPct,
    bands,
    telegram: r() > 0.35,
    tenureDays,
    tickets,
  };
}

export function generateClients(n = 12, seed = 42): DemoClient[] {
  return Array.from({ length: n }, (_, i) => generateClient(i, seed));
}

/** Kontrola, že ukázka nevypadá lépe, než je systém schopný. */
export function sanityCheck(clients: DemoClient[]) {
  const settled = clients.flatMap((c) => c.tickets.filter((t) => t.state !== "open"));
  const staked = settled.reduce((s, t) => s + t.stake, 0);
  const profit = settled.reduce((s, t) => s + t.profit, 0);
  const won = settled.filter((t) => t.profit > 0).length;

  return {
    tickets: settled.length,
    roi: staked ? Math.round((profit / staked) * 1000) / 10 : 0,
    winRate: settled.length ? Math.round((won / settled.length) * 1000) / 10 : 0,
    avgOdds: settled.length
      ? Math.round((settled.reduce((s, t) => s + t.odds, 0) / settled.length) * 100) / 100
      : 0,
  };
}
