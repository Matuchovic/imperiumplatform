/**
 * Jediný zdroj demo dat. Stránky z něj čtou, aby si čísla neodporovala.
 * Při napojení na DB se nahradí tenhle soubor, stránky zůstanou.
 */

export const ACCOUNT = {
  bankrollStart: 18_000,
  bankroll: 34_200,
  goal: 50_000,
  unitPct: 2,
  roi: 12.4,
  hitRate: 61.8,
  yield: 8.1,
  ticketsTotal: 428,
  openTickets: 3,
};

export const unitSize = () => Math.round((ACCOUNT.bankroll * ACCOUNT.unitPct) / 100);
export const goalPct = () => Math.round((ACCOUNT.bankroll / ACCOUNT.goal) * 100);

/** Kolik tiketů ještě zbývá při daném yieldu — stejný výpočet jako v onboardingu. */
export function ticketsToGoal(): number {
  const growth = (ACCOUNT.unitPct / 100) * (ACCOUNT.yield / 100);
  return Math.round(Math.log(ACCOUNT.goal / ACCOUNT.bankroll) / Math.log(1 + growth));
}

export const EQUITY = [
  18.0, 18.4, 17.9, 19.1, 19.6, 19.2, 20.4, 21.0, 20.5, 21.8,
  22.6, 22.1, 23.4, 24.0, 23.5, 25.1, 25.9, 25.4, 26.8, 27.6,
  27.1, 28.9, 29.7, 29.2, 30.8, 31.6, 31.1, 32.9, 33.8, 34.2,
];

export type TicketState = "live" | "won" | "lost" | "void";

export type Ticket = {
  id: string;
  date: string;
  sport: string;
  event: string;
  market: string;
  odds: number;
  units: number;
  state: TicketState;
  profit: number;
};

export const TICKETS: Ticket[] = [
  { id: "T-2418", date: "26. 8.", sport: "Fotbal", event: "Sparta – Slavia", market: "Over 2.5", odds: 1.85, units: 2.0, state: "live", profit: 0 },
  { id: "T-2417", date: "25. 8.", sport: "Basketbal", event: "Lakers – Celtics", market: "AH -3.5", odds: 1.92, units: 1.5, state: "won", profit: 993 },
  { id: "T-2416", date: "25. 8.", sport: "Fotbal", event: "Arsenal – Chelsea", market: "BTTS ano", odds: 1.72, units: 2.0, state: "won", profit: 1037 },
  { id: "T-2415", date: "24. 8.", sport: "Tenis", event: "Djoković – Alcaraz", market: "Over 3.5 setů", odds: 2.40, units: 1.0, state: "lost", profit: -684 },
  { id: "T-2414", date: "24. 8.", sport: "Hokej", event: "Kometa – Třinec", market: "1X", odds: 1.65, units: 2.5, state: "won", profit: 1112 },
  { id: "T-2413", date: "23. 8.", sport: "Fotbal", event: "Bayern – Dortmund", market: "Over 3.5", odds: 2.10, units: 1.0, state: "lost", profit: -684 },
  { id: "T-2412", date: "23. 8.", sport: "Tenis", event: "Sinner – Medveděv", market: "Sinner -4.5 gemu", odds: 1.88, units: 2.0, state: "won", profit: 1204 },
  { id: "T-2411", date: "22. 8.", sport: "Fotbal", event: "Plzeň – Baník", market: "1", odds: 1.55, units: 3.0, state: "won", profit: 1128 },
  { id: "T-2410", date: "22. 8.", sport: "Basketbal", event: "Nuggets – Suns", market: "Over 224.5", odds: 1.90, units: 1.5, state: "void", profit: 0 },
  { id: "T-2409", date: "21. 8.", sport: "Hokej", event: "Sparta – Pardubice", market: "Over 5.5", odds: 2.05, units: 1.0, state: "lost", profit: -684 },
];

export const BY_SPORT = [
  { sport: "Fotbal", tickets: 186, hit: 63.4, roi: 14.2 },
  { sport: "Tenis", tickets: 104, hit: 59.6, roi: 9.8 },
  { sport: "Basketbal", tickets: 82, hit: 62.2, roi: 11.5 },
  { sport: "Hokej", tickets: 56, hit: 60.7, roi: 8.3 },
];

export const BY_MONTH = [
  { month: "Březen", profit: 1420, tickets: 61 },
  { month: "Duben", profit: -860, tickets: 74 },
  { month: "Květen", profit: 3180, tickets: 82 },
  { month: "Červen", profit: 2640, tickets: 78 },
  { month: "Červenec", profit: 4910, tickets: 71 },
  { month: "Srpen", profit: 4910, tickets: 62 },
];

export const MOVEMENTS = [
  { date: "1. 3.", label: "Počáteční vklad", amount: 18_000 },
  { date: "12. 5.", label: "Doplnění bankrollu", amount: 5_000 },
  { date: "3. 7.", label: "Výběr zisku", amount: -4_000 },
];
