import { describe, it, expect } from "vitest";
import { consensus, median, findDivergence } from "@/lib/market/consensus";

const q = (bookmaker: string, odds: number, previousOdds?: number) => ({ bookmaker, odds, previousOdds });

describe("medián", () => {
  it("z lichého počtu vrátí prostřední", () => {
    expect(median([1.8, 1.9, 2.0])).toBe(1.9);
  });

  it("ze sudého počtu vrátí průměr dvou prostředních", () => {
    expect(median([1.8, 1.9, 2.0, 2.1])).toBeCloseTo(1.95, 9);
  });

  it("neplatné kurzy ignoruje", () => {
    expect(median([1.9, 0, -1, 1])).toBe(1.9);
  });

  it("z prázdného pole vrátí null", () => {
    expect(median([])).toBeNull();
  });
});

describe("shoda kanceláří", () => {
  it("bez dat hlásí nedostatek", () => {
    expect(consensus([]).agreement).toBe("INSUFFICIENT_DATA");
  });

  it("pod pěti kancelářemi shodu nevyhodnocuje", () => {
    const c = consensus([q("A", 1.9, 2.0), q("B", 1.88, 2.0), q("C", 1.91, 2.0)]);
    expect(c.agreement).toBe("INSUFFICIENT_DATA");
  });

  it("většinový pokles hlásí jako silný dolů", () => {
    const c = consensus([
      q("A", 1.88, 2.0), q("B", 1.86, 2.0), q("C", 1.90, 2.0),
      q("D", 1.87, 2.0), q("E", 1.89, 2.0), q("F", 2.02, 2.0),
    ]);
    expect(c.agreement).toBe("STRONG_DOWNWARD");
    expect(c.dropping).toBe(5);
  });

  it("rozporuplný pohyb hlásí jako smíšený", () => {
    const c = consensus([
      q("A", 1.85, 2.0), q("B", 1.88, 2.0), q("C", 2.15, 2.0),
      q("D", 2.12, 2.0), q("E", 2.00, 2.0),
    ]);
    expect(c.agreement).toBe("MIXED");
  });

  it("nejlepší, nejhorší a rozpětí sedí", () => {
    const c = consensus([q("A", 1.88), q("B", 1.94), q("C", 2.01)]);
    expect(c.best).toBe(2.01);
    expect(c.worst).toBe(1.88);
    expect(c.spreadPct).toBeCloseTo(((2.01 - 1.88) / 1.88) * 100, 6);
  });
});

describe("rozpor mezi kancelářemi", () => {
  it("odlehlou nabídku najde", () => {
    const d = findDivergence([
      q("A", 1.90), q("B", 1.89), q("C", 1.91),
      q("D", 1.90), q("E", 2.16),
    ]);
    expect(d.detected).toBe(true);
    expect(d.bookmaker).toBe("E");
    expect(d.deviationPct!).toBeGreaterThan(6);
  });

  it("u vyrovnaného trhu nic nehlásí", () => {
    const d = findDivergence([
      q("A", 1.90), q("B", 1.91), q("C", 1.89), q("D", 1.90), q("E", 1.92),
    ]);
    expect(d.detected).toBe(false);
  });

  it("při málo kancelářích nerozhoduje", () => {
    expect(findDivergence([q("A", 1.90), q("B", 2.40)]).detected).toBe(false);
  });
});
