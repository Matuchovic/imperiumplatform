import { describe, it, expect } from "vitest";
import {
  impliedProb, overround, devigPower, devigMultiplicative,
  expectedValue, kellyFraction, stakeInUnits, clv, thresholdOdds,
} from "@/lib/engine/math";

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

describe("odstranění marže", () => {
  it("mocninná metoda dá součet pravděpodobností přesně 1", () => {
    for (const odds of [[1.91, 1.91], [2.10, 1.80], [1.30, 4.20], [2.5, 3.1, 3.0]]) {
      expect(sum(devigPower(odds))).toBeCloseTo(1, 9);
    }
  });

  it("multiplikativní metoda taky dá součet 1", () => {
    expect(sum(devigMultiplicative([1.91, 1.91]))).toBeCloseTo(1, 9);
    expect(sum(devigMultiplicative([2.5, 3.1, 3.0]))).toBeCloseTo(1, 9);
  });

  it("u symetrického trhu vyjde přesně půl na půl", () => {
    const [a, b] = devigPower([1.91, 1.91]);
    expect(a).toBeCloseTo(0.5, 9);
    expect(b).toBeCloseTo(0.5, 9);
  });

  it("nižší kurz má vyšší pravděpodobnost", () => {
    const [fav, dog] = devigPower([1.30, 4.20]);
    expect(fav).toBeGreaterThan(dog);
  });

  it("obě metody dají u dvoucestného trhu blízký výsledek", () => {
    const p = devigPower([2.10, 1.80]);
    const m = devigMultiplicative([2.10, 1.80]);
    expect(Math.abs(p[0] - m[0])).toBeLessThan(0.02);
  });

  it("součet pravděpodobností je nad 1 u reálného trhu a roven 1 u férového", () => {
    // Pozor na dvojí význam slova: tahle funkce vrací SOUČET,
    // ne přebytek nad jedničkou. Marže knihovny = součet − 1.
    expect(overround([1.91, 1.91])).toBeGreaterThan(1);
    expect(overround([2, 2])).toBeCloseTo(1, 9);
    expect(overround([1.91, 1.91]) - 1).toBeCloseTo(0.0471, 3);
  });

  it("implikovaná pravděpodobnost je převrácený kurz", () => {
    expect(impliedProb(2)).toBe(0.5);
    expect(impliedProb(4)).toBe(0.25);
  });
});

describe("hodnota a sázka", () => {
  it("EV je nula, když kurz přesně odpovídá pravděpodobnosti", () => {
    expect(expectedValue(0.5, 2)).toBeCloseTo(0, 9);
  });

  it("EV je kladné při lepším kurzu a záporné při horším", () => {
    expect(expectedValue(0.5, 2.2)).toBeCloseTo(0.1, 9);
    expect(expectedValue(0.5, 1.8)).toBeCloseTo(-0.1, 9);
  });

  it("Kelly je nula, když výhoda není", () => {
    expect(kellyFraction(0.5, 2)).toBeCloseTo(0, 9);
  });

  it("Kelly nikdy nevrátí zápornou sázku", () => {
    expect(kellyFraction(0.4, 2)).toBe(0);
    expect(kellyFraction(0.1, 1.5)).toBe(0);
  });

  it("Kelly u kurzu 1 nebo nižšího vrátí nulu, ne nekonečno", () => {
    expect(kellyFraction(0.9, 1)).toBe(0);
    expect(kellyFraction(0.9, 0.5)).toBe(0);
  });

  it("vyšší výhoda znamená vyšší sázku", () => {
    expect(kellyFraction(0.55, 2)).toBeGreaterThan(kellyFraction(0.52, 2));
  });

  it("sázka v jednotkách je omezená stropem", () => {
    const units = stakeInUnits(0.9, 3, { fraction: 1, unitPct: 1, maxUnits: 5 });
    expect(units).toBeLessThanOrEqual(5);
  });

  it("bez výhody je sázka nulová", () => {
    expect(stakeInUnits(0.5, 2, { fraction: 0.25, unitPct: 2, maxUnits: 5 })).toBe(0);
  });

  it("zlomkový Kelly sází méně než plný", () => {
    const opts = { unitPct: 2, maxUnits: 100 };
    const full = stakeInUnits(0.55, 2, { ...opts, fraction: 1 });
    const quarter = stakeInUnits(0.55, 2, { ...opts, fraction: 0.25 });
    expect(quarter).toBeLessThan(full);
  });
});

describe("prahový kurz a CLV", () => {
  it("prahový kurz roste s požadovanou výhodou", () => {
    expect(thresholdOdds(0.5, 0.03)).toBeGreaterThan(thresholdOdds(0.5, 0.01));
  });

  it("sázka přesně na prahu dá právě požadované EV", () => {
    const t = thresholdOdds(0.5, 0.03);
    expect(expectedValue(0.5, t)).toBeCloseTo(0.03, 9);
  });

  it("CLV je nula při shodě se závěrečným kurzem", () => {
    expect(clv(2, 2)).toBeCloseTo(0, 9);
  });

  it("CLV je kladné, když jsme vsadili nad závěrečný kurz", () => {
    expect(clv(2.1, 2)).toBeCloseTo(0.05, 9);
    expect(clv(1.9, 2)).toBeCloseTo(-0.05, 9);
  });
});
