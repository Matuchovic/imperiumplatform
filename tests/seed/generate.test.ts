import { describe, it, expect } from "vitest";
import {
  rng, generateClient, generateClients, sanityCheck, DEMO_EDGE, DEMO_TAG,
} from "@/lib/seed/generate";
import { payoutFor } from "@/lib/bankroll/math";

describe("generátor", () => {
  it("stejné semínko dá stejná data", () => {
    expect(JSON.stringify(generateClient(0, 42))).toBe(JSON.stringify(generateClient(0, 42)));
  });

  it("jiné semínko dá jiná data", () => {
    expect(JSON.stringify(generateClient(0, 42))).not.toBe(JSON.stringify(generateClient(0, 99)));
  });

  it("generátor náhody drží rozsah 0 až 1", () => {
    const r = rng(1);
    for (let i = 0; i < 500; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("každý klient je označený jako ukázka", () => {
    for (const c of generateClients(12)) expect(c.name).toContain(DEMO_TAG);
  });

  it("klient dostává jen tikety z pásem, která odebírá", () => {
    for (const c of generateClients(12)) {
      for (const t of c.tickets) expect(c.bands).toContain(t.band);
    }
  });

  it("zisk sedí na výplatu podle skutečné matematiky", () => {
    for (const c of generateClients(6)) {
      for (const t of c.tickets) {
        if (t.state === "open") continue;
        expect(t.profit).toBeCloseTo(payoutFor(t.state, t.stake, t.odds) - t.stake, 2);
      }
    }
  });
});

describe("poctivost ukázky", () => {
  const data = generateClients(12);
  const s = sanityCheck(data);

  it("vyrobí dost tiketů, aby přehled dával smysl", () => {
    expect(s.tickets).toBeGreaterThan(200);
  });

  it("ROI je v pásmu, jaké systém skutečně umí", () => {
    // Ukázka s ROI +18 % vytvoří očekávání, které produkt nesplní.
    expect(s.roi).toBeGreaterThan(-8);
    expect(s.roi).toBeLessThan(12);
  });

  it("úspěšnost odpovídá průměrnému kurzu, ne přání", () => {
    // Při kurzu d je úspěšnost zhruba (1 + výhoda) / d.
    const expected = ((1 + DEMO_EDGE) / s.avgOdds) * 100;
    expect(Math.abs(s.winRate - expected)).toBeLessThan(12);
  });

  it("neobsahuje nemožnou kombinaci vysoké úspěšnosti a vysokého kurzu", () => {
    // 61,8 % při kurzu 1,92 by byla výhoda 18,7 % — to neexistuje.
    const impliedEdge = (s.winRate / 100) * s.avgOdds - 1;
    expect(impliedEdge).toBeLessThan(0.10);
  });

  it("obsahuje i prohry a zrušené sázky", () => {
    const all = data.flatMap((c) => c.tickets);
    expect(all.some((t) => t.state === "lost")).toBe(true);
    expect(all.some((t) => t.state === "open")).toBe(true);
  });
});
