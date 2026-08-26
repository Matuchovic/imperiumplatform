import { describe, it, expect } from "vitest";
import { settleBet } from "@/lib/results/settle";
import type { MatchResult } from "@/lib/results/base";

const finished = (h: number, a: number): MatchResult => ({
  eventId: "e1", status: "finished", homeScore: h, awayScore: a,
  finishedAt: "2026-08-26T20:00:00Z",
});

describe("vyhodnocení 1X2", () => {
  it("domácí vyhráli", () => {
    expect(settleBet({ market: "1X2", selection: "1" }, finished(2, 1))).toBe("won");
    expect(settleBet({ market: "1X2", selection: "2" }, finished(2, 1))).toBe("lost");
    expect(settleBet({ market: "1X2", selection: "X" }, finished(2, 1))).toBe("lost");
  });

  it("remíza", () => {
    expect(settleBet({ market: "1X2", selection: "X" }, finished(1, 1))).toBe("won");
    expect(settleBet({ market: "1X2", selection: "1" }, finished(1, 1))).toBe("lost");
  });

  it("dvojtipy", () => {
    expect(settleBet({ market: "1X2", selection: "1X" }, finished(1, 1))).toBe("won");
    expect(settleBet({ market: "1X2", selection: "X2" }, finished(0, 2))).toBe("won");
    expect(settleBet({ market: "1X2", selection: "12" }, finished(1, 1))).toBe("lost");
  });
});

describe("vyhodnocení počtu gólů", () => {
  it("nad čárou", () => {
    expect(settleBet({ market: "TOTALS", selection: "O 2.5" }, finished(2, 1))).toBe("won");
    expect(settleBet({ market: "TOTALS", selection: "O 2.5" }, finished(1, 1))).toBe("lost");
  });

  it("pod čárou", () => {
    expect(settleBet({ market: "TOTALS", selection: "U 2.5" }, finished(1, 1))).toBe("won");
  });

  it("přesná shoda s celou čárou vrací vklad", () => {
    expect(settleBet({ market: "TOTALS", selection: "O 3" }, finished(2, 1))).toBe("push");
    expect(settleBet({ market: "TOTALS", selection: "U 3" }, finished(2, 1))).toBe("push");
  });
});

describe("oba týmy skórují", () => {
  it("ano", () => {
    expect(settleBet({ market: "BTTS", selection: "YES" }, finished(2, 1))).toBe("won");
    expect(settleBet({ market: "BTTS", selection: "YES" }, finished(2, 0))).toBe("lost");
  });

  it("ne", () => {
    expect(settleBet({ market: "BTTS", selection: "NO" }, finished(2, 0))).toBe("won");
  });
});

describe("stavy, kde se nezúčtovává", () => {
  it("neskončený zápas zůstává otevřený", () => {
    const running: MatchResult = { eventId: "e1", status: "in_progress", homeScore: 1, awayScore: 0, finishedAt: null };
    expect(settleBet({ market: "1X2", selection: "1" }, running)).toBe("undecided");
  });

  it("zrušený a odložený zápas vrací vklad", () => {
    for (const status of ["cancelled", "postponed"] as const) {
      const r: MatchResult = { eventId: "e1", status, homeScore: null, awayScore: null, finishedAt: null };
      expect(settleBet({ market: "1X2", selection: "1" }, r)).toBe("void");
    }
  });

  it("chybějící skóre se nedopočítává", () => {
    const r: MatchResult = { eventId: "e1", status: "finished", homeScore: null, awayScore: 1, finishedAt: null };
    expect(settleBet({ market: "1X2", selection: "1" }, r)).toBe("undecided");
  });

  it("neznámý trh se raději nechá člověku", () => {
    expect(settleBet({ market: "CORNERS_HANDICAP", selection: "-2.5" }, finished(2, 1))).toBe("undecided");
  });
});
