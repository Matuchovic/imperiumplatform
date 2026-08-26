import { describe, it, expect } from "vitest";
import { shouldEmit, dedupeKey, COOLDOWN_MINUTES } from "@/lib/market/dedupe";
import type { MarketSignal, Severity } from "@/lib/market/signals";

const sig = (severity: Severity): MarketSignal => ({
  type: "ODDS_DROPPING",
  eventId: "e1", marketId: "m1", selectionId: "s1",
  detectedAt: "2026-08-26T18:00:00Z",
  severity, source: "watcher", metrics: {},
});

const ago = (min: number) => new Date(Date.parse("2026-08-26T18:00:00Z") - min * 60000).toISOString();
const NOW = new Date("2026-08-26T18:00:00Z");

describe("deduplikace signálů", () => {
  it("klíč je stejný pro tentýž trh a typ", () => {
    expect(dedupeKey(sig("low"))).toBe("e1:m1:s1:ODDS_DROPPING");
  });

  it("první signál projde vždy", () => {
    expect(shouldEmit(sig("medium"), null, NOW)).toEqual({ emit: true, reason: "first" });
  });

  it("opakování v cooldownu neprojde", () => {
    const prior = { severity: "medium" as Severity, createdAt: ago(2) };
    expect(shouldEmit(sig("medium"), prior, NOW).emit).toBe(false);
  });

  it("po uplynutí cooldownu projde", () => {
    const prior = { severity: "medium" as Severity, createdAt: ago(COOLDOWN_MINUTES.medium + 1) };
    const d = shouldEmit(sig("medium"), prior, NOW);
    expect(d.emit).toBe(true);
    expect(d.reason).toBe("cooldown_elapsed");
  });

  it("eskalace projde i uvnitř cooldownu", () => {
    // Ze středního na kritický: mlčet by bylo horší než opakovat se.
    const prior = { severity: "medium" as Severity, createdAt: ago(1) };
    const d = shouldEmit(sig("critical"), prior, NOW);
    expect(d.emit).toBe(true);
    expect(d.reason).toBe("escalation");
  });

  it("pokles závažnosti nový alert nevyrobí", () => {
    const prior = { severity: "critical" as Severity, createdAt: ago(1) };
    expect(shouldEmit(sig("low"), prior, NOW).emit).toBe(false);
  });

  it("kritické signály mají kratší cooldown než informační", () => {
    expect(COOLDOWN_MINUTES.critical).toBeLessThan(COOLDOWN_MINUTES.info);
  });

  it("série 2.02 → 2.01 → 2.00 vyrobí jediný alert", () => {
    let prior: { severity: Severity; createdAt: string } | null = null;
    let emitted = 0;
    for (const _ of [2.02, 2.01, 2.00]) {
      const d = shouldEmit(sig("low"), prior, NOW);
      if (d.emit) { emitted++; prior = { severity: "low", createdAt: NOW.toISOString() }; }
    }
    expect(emitted).toBe(1);
  });
});
