import { describe, it, expect } from "vitest";
import { detectIncident } from "@/lib/market/incidents";
import type { MarketSignal, Severity, SignalType } from "@/lib/market/signals";

const NOW = new Date("2026-08-26T18:30:00Z");
const at = (minAgo: number) => new Date(NOW.getTime() - minAgo * 60000).toISOString();

const s = (type: SignalType, severity: Severity, minAgo = 1): MarketSignal => ({
  type, eventId: "e1", marketId: "m1", selectionId: "s1",
  detectedAt: at(minAgo), severity, source: "watcher", metrics: {},
});

describe("incident engine", () => {
  it("z prázdného seznamu incident nevznikne", () => {
    expect(detectIncident([], NOW)).toBeNull();
  });

  it("jeden mírný signál incident nevyrobí", () => {
    expect(detectIncident([s("ODDS_DROPPING", "low")], NOW)).toBeNull();
  });

  it("extrémní pohyb stačí sám o sobě", () => {
    const i = detectIncident([s("EXTREME_MOVE", "critical")], NOW);
    expect(i).not.toBeNull();
    expect(i!.severity).toBe("critical");
  });

  it("dva závažné signály vyrobí incident", () => {
    const i = detectIncident([
      s("MAJOR_MOVE", "high", 3),
      s("MARKET_SUSPENDED", "high", 1),
    ], NOW);
    expect(i).not.toBeNull();
    expect(i!.signals).toHaveLength(2);
  });

  it("tři signály v okně vyrobí incident i při nižší závažnosti", () => {
    const i = detectIncident([
      s("ODDS_DROPPING", "low", 5),
      s("VALUE_WEAKENING", "medium", 3),
      s("CONSENSUS_SHIFT", "low", 1),
    ], NOW);
    expect(i).not.toBeNull();
  });

  it("staré signály mimo okno se nepočítají", () => {
    const i = detectIncident([
      s("ODDS_DROPPING", "low", 60),
      s("VALUE_WEAKENING", "medium", 45),
      s("CONSENSUS_SHIFT", "low", 30),
    ], NOW);
    expect(i).toBeNull();
  });

  it("závažnost incidentu je ta nejvyšší ze signálů", () => {
    const i = detectIncident([
      s("ODDS_DROPPING", "low", 3),
      s("EXTREME_MOVE", "critical", 2),
      s("VALUE_WEAKENING", "medium", 1),
    ], NOW);
    expect(i!.severity).toBe("critical");
  });

  it("důvod vzniku je vysvětlitelný bez modelu", () => {
    const i = detectIncident([s("MARKET_ANOMALY", "high")], NOW);
    expect(i!.trigger).toContain("MARKET_ANOMALY");
  });
});
