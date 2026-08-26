import { describe, it, expect } from "vitest";
import {
  pctChange, classifyMovement, direction, severityFor,
  valueStatus, velocityPctPerHour, isRapid,
} from "@/lib/market/signals";

describe("procentní změna", () => {
  it("beze změny vrátí nulu", () => {
    expect(pctChange(2, 2)).toBe(0);
  });

  it("pokles 2.20 → 1.98 je −10 %", () => {
    expect(pctChange(2.20, 1.98)).toBeCloseTo(-10, 9);
  });

  it("růst 1.80 → 2.05 je kladný", () => {
    expect(pctChange(1.80, 2.05)).toBeGreaterThan(0);
  });

  it("nulový nebo záporný výchozí kurz nedělí nulou", () => {
    expect(pctChange(0, 2)).toBe(0);
    expect(pctChange(-1, 2)).toBe(0);
  });
});

describe("klasifikace pohybu", () => {
  it("řadí do pásem podle velikosti", () => {
    expect(classifyMovement(0.5)).toBe("STABLE");
    expect(classifyMovement(3)).toBe("SMALL_MOVE");
    expect(classifyMovement(7)).toBe("SIGNIFICANT_MOVE");
    expect(classifyMovement(15)).toBe("MAJOR_MOVE");
    expect(classifyMovement(25)).toBe("EXTREME_MOVE");
  });

  it("nezáleží na směru, jen na velikosti", () => {
    expect(classifyMovement(-15)).toBe(classifyMovement(15));
  });

  it("hodnota přesně na prahu patří do vyššího pásma", () => {
    expect(classifyMovement(2)).toBe("SMALL_MOVE");
    expect(classifyMovement(5)).toBe("SIGNIFICANT_MOVE");
    expect(classifyMovement(20)).toBe("EXTREME_MOVE");
  });
});

describe("směr a závažnost", () => {
  it("malý pohyb je stabilní bez ohledu na znaménko", () => {
    expect(direction(1)).toBe("STABLE");
    expect(direction(-1)).toBe("STABLE");
  });

  it("rozlišuje pokles a růst", () => {
    expect(direction(-6)).toBe("ODDS_DROPPING");
    expect(direction(6)).toBe("ODDS_RISING");
  });

  it("závažnost roste s velikostí pohybu", () => {
    expect(severityFor(1)).toBe("info");
    expect(severityFor(3)).toBe("low");
    expect(severityFor(8)).toBe("medium");
    expect(severityFor(15)).toBe("high");
    expect(severityFor(30)).toBe("critical");
  });
});

describe("stav hodnoty", () => {
  const published = 2.14, minimum = 1.90;

  it("kurz nad publikovaným je silná hodnota", () => {
    expect(valueStatus(2.20, minimum, published)).toBe("STRONG_VALUE");
  });

  it("kurz s rezervou nad minimem je v pořádku", () => {
    expect(valueStatus(2.08, minimum, published)).toBe("VALUE_OK");
  });

  it("kurz těsně nad minimem hodnotu ztrácí", () => {
    expect(valueStatus(1.92, minimum, published)).toBe("VALUE_WEAKENING");
  });

  it("kurz pod minimem je ztráta hodnoty", () => {
    expect(valueStatus(1.86, minimum, published)).toBe("VALUE_LOST");
  });

  it("kurz přesně na minimu ještě není ztráta", () => {
    expect(valueStatus(1.90, minimum, published)).toBe("VALUE_WEAKENING");
  });

  it("chybějící nebo nesmyslný kurz znamená nedostupný trh", () => {
    expect(valueStatus(null, minimum, published)).toBe("MARKET_UNAVAILABLE");
    expect(valueStatus(1, minimum, published)).toBe("MARKET_UNAVAILABLE");
    expect(valueStatus(0, minimum, published)).toBe("MARKET_UNAVAILABLE");
  });
});

describe("rychlost pohybu", () => {
  it("stejná změna za kratší dobu má vyšší rychlost", () => {
    const fast = velocityPctPerHour(-10, 5)!;
    const slow = velocityPctPerHour(-10, 360)!;
    expect(Math.abs(fast)).toBeGreaterThan(Math.abs(slow));
  });

  it("bez uplynulého času se rychlost nedopočítává", () => {
    // Zadání to říká výslovně: chybějící granularitu nefalšovat.
    expect(velocityPctPerHour(-10, 0)).toBeNull();
    expect(velocityPctPerHour(-10, -5)).toBeNull();
  });

  it("−10 % za 4 minuty je rychlý pohyb, za 24 hodin ne", () => {
    expect(isRapid(-10, 4)).toBe(true);
    expect(isRapid(-10, 1440)).toBe(false);
  });
});
