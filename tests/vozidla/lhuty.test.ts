import { describe, it, expect } from "vitest";
import {
  naleha, zbyva, nejhorsiLhuta, ujeto, normalizujSpz, STAVY, PALIVA,
} from "@/lib/vozidla/lhuty";

const dnes = new Date(2026, 7, 27);
const za = (dni: number) => {
  const d = new Date(2026, 7, 27);
  d.setDate(d.getDate() + dni);
  return d.toISOString().slice(0, 10);
};

describe("naléhavost lhůty", () => {
  it("bez data je nezadáno", () => {
    expect(naleha(null, new Date(dnes))).toBe("nezadano");
  });

  it("propadlá lhůta", () => {
    expect(naleha(za(-1), new Date(dnes))).toBe("propadle");
    expect(naleha(za(-90), new Date(dnes))).toBe("propadle");
  });

  it("do týdne je poslední chvíle", () => {
    expect(naleha(za(0), new Date(dnes))).toBe("brzy");
    expect(naleha(za(7), new Date(dnes))).toBe("brzy");
  });

  it("do měsíce se blíží", () => {
    expect(naleha(za(8), new Date(dnes))).toBe("blizi");
    expect(naleha(za(30), new Date(dnes))).toBe("blizi");
  });

  it("dál je v pořádku", () => {
    expect(naleha(za(31), new Date(dnes))).toBe("ok");
    expect(naleha(za(400), new Date(dnes))).toBe("ok");
  });
});

describe("zbývá do lhůty", () => {
  it("dnes a zítra mají vlastní slovo", () => {
    expect(zbyva(za(0), dnes)).toBe("dnes");
    expect(zbyva(za(1), dnes)).toBe("zítra");
  });

  it("dny se skloňují", () => {
    expect(zbyva(za(2), dnes)).toBe("za 2 dny");
    expect(zbyva(za(9), dnes)).toBe("za 9 dní");
  });

  it("po termínu se počítá zpět", () => {
    expect(zbyva(za(-1), dnes)).toBe("po termínu o 1 den");
    expect(zbyva(za(-12), dnes)).toBe("po termínu o 12 dní");
  });

  it("nad dva měsíce se přepne na měsíce", () => {
    expect(zbyva(za(90), dnes)).toBe("za 3 měsíce");
    expect(zbyva(za(180), dnes)).toBe("za 6 měsíců");
  });

  it("bez data nespadne", () => {
    expect(zbyva(null, dnes)).toBe("nezadáno");
  });
});

describe("nejhorší lhůta vozidla", () => {
  const prazdne = { stk_do: null, pojisteni_do: null, znamka_do: null, servis_do: null };

  it("vezme tu nejnaléhavější", () => {
    expect(nejhorsiLhuta({ ...prazdne, stk_do: za(-5), pojisteni_do: za(200) }, dnes))
      .toBe("propadle");
    expect(nejhorsiLhuta({ ...prazdne, stk_do: za(200), znamka_do: za(20) }, dnes))
      .toBe("blizi");
  });

  it("bez lhůt vrátí nezadáno", () => {
    expect(nejhorsiLhuta(prazdne, dnes)).toBe("nezadano");
  });

  it("nezadaná lhůta nepřebije propadlou", () => {
    // Auto s propadlou STK a bez pojištění je propadlé, ne nezadané.
    expect(nejhorsiLhuta({ ...prazdne, stk_do: za(-1) }, dnes)).toBe("propadle");
  });
});

describe("kilometry a SPZ", () => {
  it("ujeté km nejdou do minusu", () => {
    expect(ujeto(1000, 1250)).toBe(250);
    expect(ujeto(1250, 1000)).toBe(0);
  });

  it("SPZ se porovnává bez mezer a velikostí písmen", () => {
    expect(normalizujSpz("1ab 2345")).toBe("1AB2345");
    expect(normalizujSpz("1AB2345")).toBe(normalizujSpz("1ab 23 45"));
  });
});

describe("číselníky", () => {
  it("každý stav má název i barvu", () => {
    for (const s of Object.values(STAVY)) {
      expect(s.nazev.length).toBeGreaterThan(0);
      expect(s.barva).toMatch(/^#/);
    }
  });

  it("paliva odpovídají tomu, co povoluje databáze", () => {
    expect(Object.keys(PALIVA).sort()).toEqual(["benzin", "cng", "elektro", "hybrid", "lpg", "nafta"]);
  });
});
