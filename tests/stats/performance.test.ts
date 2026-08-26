import { describe, it, expect } from "vitest";
import {
  performance, confidenceNote, goalProgress, MIN_SAMPLE_FOR_INTERVAL,
  type SettledTicket,
} from "@/lib/stats/performance";

const win = (stake = 1000, odds = 2): SettledTicket => ({ stake, odds, profit: stake * (odds - 1), clv: 0.02 });
const loss = (stake = 1000, odds = 2): SettledTicket => ({ stake, odds, profit: -stake, clv: -0.01 });
const voided = (stake = 1000, odds = 2): SettledTicket => ({ stake, odds, profit: 0, clv: null });

/** n tiketů s danou úspěšností, střídavě. */
const sample = (n: number, winRate: number, odds = 2): SettledTicket[] =>
  Array.from({ length: n }, (_, i) => (i / n < winRate ? win(1000, odds) : loss(1000, odds)));

describe("výkonnost", () => {
  it("bez tiketů vrátí nuly, ne dělení nulou", () => {
    const p = performance([]);
    expect(p.count).toBe(0);
    expect(p.roi).toBe(0);
    expect(p.roiInterval).toBeNull();
  });

  it("neplatný vklad se ignoruje", () => {
    expect(performance([win(), { stake: 0, odds: 2, profit: 5, clv: null }]).count).toBe(1);
  });

  it("počítá výhry, prohry a zrušené zvlášť", () => {
    const p = performance([win(), win(), loss(), voided()]);
    expect(p.won).toBe(2);
    expect(p.lost).toBe(1);
    expect(p.void).toBe(1);
  });

  it("ROI je zisk na vsazenou korunu", () => {
    // 2× výhra po 1000 při kurzu 2 = +2000, 2× prohra = −2000
    const p = performance([win(), win(), loss(), loss()]);
    expect(p.profit).toBe(0);
    expect(p.roi).toBe(0);
  });

  it("úspěšnost sedí", () => {
    expect(performance(sample(100, 0.55)).winRate).toBe(55);
  });

  it("průměrné CLV se počítá jen z tiketů, které ho mají", () => {
    const p = performance([win(), voided()]);
    expect(p.clvCount).toBe(1);
    expect(p.avgClv).toBe(2);
  });

  it("bez jediného CLV vrátí null, ne nulu", () => {
    expect(performance([voided()]).avgClv).toBeNull();
  });
});

describe("statistická poctivost", () => {
  it("pod prahem vzorku se interval nepočítá", () => {
    const p = performance(sample(MIN_SAMPLE_FOR_INTERVAL - 1, 0.6));
    expect(p.roiInterval).toBeNull();
    expect(p.proven).toBe(false);
  });

  it("malý vzorek to řekne nahlas", () => {
    expect(confidenceNote(performance(sample(10, 0.7)))).toContain("příliš brzy");
  });

  it("mírná výhoda na malém vzorku není prokázaná", () => {
    // 54 % při kurzu 2 je výhoda 8 %, ale 40 tiketů na průkaz nestačí.
    const p = performance(sample(40, 0.54));
    expect(p.roi).toBeGreaterThan(0);
    expect(p.proven).toBe(false);
    expect(p.roiInterval![0]).toBeLessThan(0);
  });

  it("velký vzorek se silnou výhodou už prokázaný je", () => {
    const p = performance(sample(3000, 0.6));
    expect(p.proven).toBe(true);
    expect(p.roiInterval![0]).toBeGreaterThan(0);
  });

  it("u neprokázaného zisku spočítá potřebný vzorek", () => {
    const p = performance(sample(100, 0.53));
    expect(p.proven).toBe(false);
    expect(p.needForProof).toBeGreaterThan(100);
  });

  it("interval je symetrický kolem ROI", () => {
    const p = performance(sample(500, 0.55));
    const [lo, hi] = p.roiInterval!;
    expect(Math.abs((lo + hi) / 2 - p.roi)).toBeLessThan(0.6);
  });

  it("ztrátový systém se nikdy neoznačí za prokázaný", () => {
    expect(performance(sample(2000, 0.4)).proven).toBe(false);
  });
});

describe("postup k cíli", () => {
  it("na startu je nula procent", () => {
    expect(goalProgress(20000, 20000, 50000).pct).toBe(0);
  });

  it("v polovině cesty je padesát", () => {
    expect(goalProgress(35000, 20000, 50000).pct).toBe(50);
  });

  it("nad cílem se nepřekročí sto a hlásí dosažení", () => {
    const g = goalProgress(60000, 20000, 50000);
    expect(g.pct).toBe(100);
    expect(g.reached).toBe(true);
  });

  it("pod startem nejde do záporu", () => {
    expect(goalProgress(10000, 20000, 50000).pct).toBe(0);
  });

  it("nesmyslný cíl nedělí nulou", () => {
    expect(goalProgress(20000, 20000, 20000).pct).toBe(0);
  });
});
