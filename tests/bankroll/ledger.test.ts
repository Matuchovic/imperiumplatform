import { describe, it, expect } from "vitest";
import { payoutFor, profitFor, keys, round2, sumEntries } from "@/lib/bankroll/math";

describe("výplata a zisk", () => {
  it("výhra vrací celý obrat, tedy vklad i zisk", () => {
    expect(payoutFor("won", 1000, 1.92)).toBe(1920);
    expect(profitFor("won", 1000, 1.92)).toBe(920);
  });

  it("prohra nevrací nic a zisk je záporný o celý vklad", () => {
    expect(payoutFor("lost", 1000, 1.92)).toBe(0);
    expect(profitFor("lost", 1000, 1.92)).toBe(-1000);
  });

  it("zrušená sázka vrací vklad a zisk je nula", () => {
    expect(payoutFor("void", 1000, 1.92)).toBe(1000);
    expect(profitFor("void", 1000, 1.92)).toBe(0);
  });

  it("celá čára vrací vklad stejně jako zrušení", () => {
    expect(payoutFor("push", 500, 1.85)).toBe(500);
    expect(profitFor("push", 500, 1.85)).toBe(0);
  });

  it("nesmyslný vklad nevyrobí výplatu", () => {
    expect(payoutFor("won", 0, 2)).toBe(0);
    expect(payoutFor("won", -100, 2)).toBe(0);
  });

  it("zaokrouhluje na haléře, ne na celé koruny", () => {
    expect(payoutFor("won", 333, 1.91)).toBe(round2(333 * 1.91));
    expect(payoutFor("won", 333, 1.91)).toBe(636.03);
  });
});

describe("klíče idempotence", () => {
  it("klíč vklad a výplata se pro týž tiket liší", () => {
    expect(keys.stake("t1")).not.toBe(keys.payout("t1"));
  });

  it("stejný tiket dá vždy stejný klíč", () => {
    expect(keys.stake("t1")).toBe(keys.stake("t1"));
  });

  it("různé tikety dají různé klíče", () => {
    expect(keys.payout("t1")).not.toBe(keys.payout("t2"));
  });
});

describe("zůstatek jako součet knihy", () => {
  const sum = sumEntries;

  it("vklad minus sázka plus výhra sedí", () => {
    // 10 000 vklad, 1 000 vsazeno, 1 920 vyplaceno
    expect(sum([10000, -1000, 1920])).toBe(10920);
  });

  it("prohraná sázka zůstatek jen sníží", () => {
    expect(sum([10000, -1000])).toBe(9000);
  });

  it("oprava protizápisem vrátí původní stav", () => {
    expect(sum([10000, -1000, 1000])).toBe(10000);
  });

  it("dvojí zápis téhož pohybu by zůstatek rozbil — proto unique klíč", () => {
    const spravne = sum([10000, -1000]);
    const dvakrat = sum([10000, -1000, -1000]);
    expect(dvakrat).not.toBe(spravne);
  });
});
