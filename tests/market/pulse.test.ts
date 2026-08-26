import { describe, it, expect } from "vitest";
import { marketPulse, marketStress, stressBand } from "@/lib/market/pulse";
import { consensus } from "@/lib/market/consensus";

const quiet = consensus([]);
const syncedDrop = consensus([
  { bookmaker: "A", odds: 1.88, previousOdds: 2.0 },
  { bookmaker: "B", odds: 1.86, previousOdds: 2.0 },
  { bookmaker: "C", odds: 1.87, previousOdds: 2.0 },
  { bookmaker: "D", odds: 1.89, previousOdds: 2.0 },
  { bookmaker: "E", odds: 1.85, previousOdds: 2.0 },
]);

describe("Market Pulse", () => {
  it("klidný trh má nízkou hodnotu", () => {
    expect(marketPulse({ changePct: 0, velocityPctPerHour: 0, consensus: quiet, suspended: false }))
      .toBeLessThan(10);
  });

  it("nikdy nevyjde mimo rozsah 0–100", () => {
    const extreme = marketPulse({
      changePct: -90, velocityPctPerHour: -300, consensus: syncedDrop, suspended: true,
    });
    expect(extreme).toBeGreaterThanOrEqual(0);
    expect(extreme).toBeLessThanOrEqual(100);
  });

  it("větší pohyb dá vyšší hodnotu", () => {
    const base = { velocityPctPerHour: 0, consensus: quiet, suspended: false };
    expect(marketPulse({ ...base, changePct: -15 }))
      .toBeGreaterThan(marketPulse({ ...base, changePct: -3 }));
  });

  it("shoda kanceláří hodnotu zvyšuje", () => {
    const base = { changePct: -8, velocityPctPerHour: -10, suspended: false };
    expect(marketPulse({ ...base, consensus: syncedDrop }))
      .toBeGreaterThan(marketPulse({ ...base, consensus: quiet }));
  });

  it("chybějící rychlost se nedopočítává, jen nepřispěje", () => {
    const base = { changePct: -8, consensus: quiet, suspended: false };
    const withNull = marketPulse({ ...base, velocityPctPerHour: null });
    const withZero = marketPulse({ ...base, velocityPctPerHour: 0 });
    expect(withNull).toBe(withZero);
  });

  it("pozastavený trh přidá napětí", () => {
    const base = { changePct: -5, velocityPctPerHour: -5, consensus: quiet };
    expect(marketPulse({ ...base, suspended: true }))
      .toBeGreaterThan(marketPulse({ ...base, suspended: false }));
  });
});

describe("Market Stress", () => {
  it("čerstvá a vyrovnaná data mají nízký stres", () => {
    const s = marketStress({
      consensus: consensus([
        { bookmaker: "A", odds: 1.90 }, { bookmaker: "B", odds: 1.91 },
        { bookmaker: "C", odds: 1.89 }, { bookmaker: "D", odds: 1.90 },
        { bookmaker: "E", odds: 1.90 },
      ]),
      suspensions: 0, dataAgeMinutes: 1, divergencePct: null,
    });
    expect(s).toBeLessThan(20);
  });

  it("chybějící údaj o stáří dat sám o sobě zvyšuje stres", () => {
    const known = marketStress({ consensus: quiet, suspensions: 0, dataAgeMinutes: 0, divergencePct: null });
    const unknown = marketStress({ consensus: quiet, suspensions: 0, dataAgeMinutes: null, divergencePct: null });
    expect(unknown).toBeGreaterThan(known);
  });

  it("pozastavení stres zvyšuje", () => {
    const base = { consensus: quiet, dataAgeMinutes: 1, divergencePct: null };
    expect(marketStress({ ...base, suspensions: 3 }))
      .toBeGreaterThan(marketStress({ ...base, suspensions: 0 }));
  });

  it("pásma stresu navazují bez mezery", () => {
    expect(stressBand(0)).toBe("CALM");
    expect(stressBand(20)).toBe("CALM");
    expect(stressBand(21)).toBe("NORMAL");
    expect(stressBand(41)).toBe("ELEVATED");
    expect(stressBand(61)).toBe("HIGH");
    expect(stressBand(81)).toBe("EXTREME");
    expect(stressBand(100)).toBe("EXTREME");
  });
});
