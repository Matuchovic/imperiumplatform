import { describe, it, expect } from "vitest";
import {
  hruba, kVyplate, vyhrady, souhrn, nazevObdobi, prvniDen, posun, kc, STAVY,
} from "@/lib/vyplaty/vypocet";

const prazdny = {
  hodiny: null, sazba: null, mesicni: null,
  premie: 0, srazky: 0, zalohy: 0, hrube: null,
};

describe("hrubá mzda", () => {
  it("z hodin a sazby", () => {
    expect(hruba({ ...prazdny, hodiny: 160, sazba: 350 })).toBe(56000);
  });

  it("z měsíčního platu", () => {
    expect(hruba({ ...prazdny, mesicni: 45000 })).toBe(45000);
  });

  it("prémie se přičte", () => {
    expect(hruba({ ...prazdny, mesicni: 45000, premie: 5000 })).toBe(50000);
    expect(hruba({ ...prazdny, hodiny: 100, sazba: 300, premie: 2000 })).toBe(32000);
  });

  it("měsíční plat má přednost před hodinami", () => {
    expect(hruba({ ...prazdny, mesicni: 40000, hodiny: 160, sazba: 350 })).toBe(40000);
  });

  it("ruční přepis přebije výpočet", () => {
    expect(hruba({ ...prazdny, hodiny: 160, sazba: 350, hrube: 60000 })).toBe(60000);
  });

  it("prázdný řádek je nula, ne chyba", () => {
    expect(hruba(prazdny)).toBe(0);
  });

  it("halíře se zaokrouhlí", () => {
    expect(hruba({ ...prazdny, hodiny: 10.5, sazba: 333.33 })).toBe(3500);
  });
});

describe("k výplatě", () => {
  it("hrubá bez srážek a záloh", () => {
    expect(kVyplate({ ...prazdny, mesicni: 45000, srazky: 3000, zalohy: 10000 })).toBe(32000);
  });

  it("bez srážek se rovná hrubé", () => {
    expect(kVyplate({ ...prazdny, mesicni: 45000 })).toBe(45000);
  });

  it("může vyjít záporně — a to je vidět", () => {
    expect(kVyplate({ ...prazdny, mesicni: 10000, zalohy: 15000 })).toBe(-5000);
  });
});

describe("výhrady", () => {
  it("prázdný řádek nemá čím počítat", () => {
    expect(vyhrady(prazdny)).toContain("Chybí měsíční plat nebo hodiny se sazbou.");
  });

  it("vyplněné obojí je nejednoznačné", () => {
    const v = vyhrady({ ...prazdny, mesicni: 40000, hodiny: 160, sazba: 350 });
    expect(v.some((x) => x.includes("i hodiny"))).toBe(true);
  });

  it("přes 300 hodin je překlep", () => {
    const v = vyhrady({ ...prazdny, hodiny: 1600, sazba: 350 });
    expect(v.some((x) => x.includes("300 hodin"))).toBe(true);
  });

  it("záporné hodnoty se chytí", () => {
    expect(vyhrady({ ...prazdny, hodiny: -5, sazba: 300 })).toContain("Záporné hodiny.");
    expect(vyhrady({ ...prazdny, hodiny: 10, sazba: -300 })).toContain("Záporná sazba.");
  });

  it("zálohy nad hrubou mzdu", () => {
    const v = vyhrady({ ...prazdny, mesicni: 10000, zalohy: 15000 });
    expect(v.some((x) => x.includes("převyšují"))).toBe(true);
  });

  it("správný řádek je bez výhrad", () => {
    expect(vyhrady({ ...prazdny, mesicni: 45000, srazky: 2000 })).toEqual([]);
    expect(vyhrady({ ...prazdny, hodiny: 160, sazba: 350 })).toEqual([]);
  });
});

describe("souhrn", () => {
  it("sečte celé období", () => {
    const s = souhrn([
      { ...prazdny, mesicni: 45000, zalohy: 10000 },
      { ...prazdny, hodiny: 80, sazba: 400, srazky: 1000 },
    ]);
    expect(s.hrube).toBe(77000);
    expect(s.zalohy).toBe(10000);
    expect(s.srazky).toBe(1000);
    expect(s.kVyplate).toBe(66000);
    expect(s.hodiny).toBe(80);
  });

  it("prázdné období je nula", () => {
    expect(souhrn([]).hrube).toBe(0);
  });
});

describe("období", () => {
  it("název je česky", () => {
    expect(nazevObdobi("2026-08-01")).toBe("srpen 2026");
    expect(nazevObdobi("2026-01-01")).toBe("leden 2026");
  });

  it("první den měsíce", () => {
    expect(prvniDen(2026, 7)).toBe("2026-08-01");
    expect(prvniDen(2026, 0)).toBe("2026-01-01");
  });

  it("posun přes hranici roku", () => {
    expect(posun("2026-01-01", -1)).toBe("2025-12-01");
    expect(posun("2026-12-01", 1)).toBe("2027-01-01");
  });

  it("posun uvnitř roku", () => {
    expect(posun("2026-08-01", -1)).toBe("2026-07-01");
    expect(posun("2026-08-01", 3)).toBe("2026-11-01");
  });
});

describe("formát a číselníky", () => {
  it("koruny bez halířů s mezerami", () => {
    expect(kc(45000)).toMatch(/^45\s?000 Kč$/);
    expect(kc(1234.6)).toMatch(/^1\s?235 Kč$/);
  });

  it("každý stav má název i barvu", () => {
    for (const s of Object.values(STAVY)) {
      expect(s.nazev.length).toBeGreaterThan(0);
      expect(s.barva).toMatch(/^#/);
    }
  });
});
