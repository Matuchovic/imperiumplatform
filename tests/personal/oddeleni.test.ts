import { describe, it, expect } from "vitest";
import { oddeleniZRole, delkaPusobeni, blizeSeVyroci, ODDELENI, UVAZKY } from "@/lib/personal/oddeleni";

describe("oddělení z role", () => {
  it("vedení, obchod, provoz", () => {
    expect(oddeleniZRole("ceo")).toBe("vedeni");
    expect(oddeleniZRole("vyvojar")).toBe("vedeni");
    expect(oddeleniZRole("manazer")).toBe("obchod");
    expect(oddeleniZRole("marketing")).toBe("obchod");
    expect(oddeleniZRole("scout")).toBe("provoz");
    expect(oddeleniZRole("ucetni")).toBe("provoz");
  });

  it("neznámá role spadne do provozu, ne do chyby", () => {
    expect(oddeleniZRole("nesmysl")).toBe("provoz");
    expect(oddeleniZRole("")).toBe("provoz");
  });

  it("každé oddělení z mapy má definici", () => {
    const klice = new Set(ODDELENI.map((o) => o.klic));
    for (const r of ["ceo", "vyvojar", "manazer", "marketing", "scout", "ucetni"]) {
      expect(klice.has(oddeleniZRole(r)), r).toBe(true);
    }
  });
});

describe("délka působení", () => {
  const pred = (mesicu: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - mesicu);
    return d.toISOString().slice(0, 10);
  };

  it("bez nástupu vrátí pomlčku", () => {
    expect(delkaPusobeni(null)).toBe("—");
  });

  it("měsíce se skloňují", () => {
    expect(delkaPusobeni(pred(1))).toBe("1 měsíc");
    expect(delkaPusobeni(pred(3))).toBe("3 měsíce");
    expect(delkaPusobeni(pred(7))).toBe("7 měsíců");
  });

  it("roky se skloňují", () => {
    expect(delkaPusobeni(pred(12))).toBe("1 rok");
    expect(delkaPusobeni(pred(24))).toBe("2 roky");
    expect(delkaPusobeni(pred(60))).toBe("5 let");
  });

  it("roky a měsíce dohromady", () => {
    expect(delkaPusobeni(pred(14))).toBe("1 rok a 2 měs.");
  });

  it("ukončený poměr se počítá k datu odchodu, ne k dnešku", () => {
    expect(delkaPusobeni("2020-01-15", "2022-01-15")).toBe("2 roky");
  });
});

describe("blížící se výročí", () => {
  const zaDni = (d: number) => {
    const x = new Date();
    x.setDate(x.getDate() + d);
    // Rok zpět, aby to bylo výročí, ne nástup.
    x.setFullYear(x.getFullYear() - 2);
    return x.toISOString().slice(0, 10);
  };

  it("do měsíce se ohlásí", () => {
    expect(blizeSeVyroci(zaDni(10))).toBeLessThanOrEqual(30);
  });

  it("dál než měsíc mlčí", () => {
    expect(blizeSeVyroci(zaDni(90))).toBeNull();
  });

  it("bez nástupu mlčí", () => {
    expect(blizeSeVyroci(null)).toBeNull();
  });
});

describe("úvazky", () => {
  it("klíče odpovídají tomu, co povoluje databáze", () => {
    expect(Object.keys(UVAZKY).sort()).toEqual(["dpc", "dpp", "hpp", "osvc", "spolecnik"]);
  });
});
