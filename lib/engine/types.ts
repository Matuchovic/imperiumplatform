export type Outcome = { name: string; price: number };

export type BookmakerMarket = {
  bookmaker: string;
  market: string;
  outcomes: Outcome[];
  lastUpdate: string;
};

export type MatchOdds = {
  id: string;
  sport: string;
  commenceTime: string;
  home: string;
  away: string;
  books: BookmakerMarket[];
};

export type Candidate = {
  id: string;
  matchId: string;
  sport: string;
  event: string;
  market: string;
  selection: string;
  sharpOdds: number;
  fairProb: number;
  offeredOdds: number;
  offeredBy: string;
  ev: number;
  thresholdOdds: number;
  units: number;
  commenceTime: string;
  blocked?: string;
};

export type EngineConfig = {
  sharpBook: string;
  minEv: number;
  minOdds: number;
  maxOdds: number;
  kellyFraction: number;
  unitPct: number;
  maxUnits: number;
};

export const DEFAULT_CONFIG: EngineConfig = {
  sharpBook: "pinnacle",
  minEv: 0.02,
  minOdds: 1.4,
  maxOdds: 4.0,
  kellyFraction: 0.25,
  unitPct: 2,
  maxUnits: 3,
};
