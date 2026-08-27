import { describe, it, expect } from "vitest";
import { jmeninyDne, jmeninyNa, nejblizsiSvatky } from "@/lib/svatky/jmeniny";

describe("kalendář jmenin", () => {
  it("zná známá data", () => {
    expect(jmeninyNa(1, 1)).toBe("Nový rok");
    expect(jmeninyNa(12, 24)).toBe("Adam a Eva");
    expect(jmeninyNa(5, 1)).toBe("Svátek práce");
    expect(jmeninyNa(7, 5)).toBe("Cyril a Metoděj");
  });

  it("každý měsíc má správný počet dnů", () => {
    const dny = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (let m = 1; m <= 12; m++) {
      const posledni = jmeninyNa(m, dny[m - 1]);
      expect(posledni, `měsíc ${m}`).not.toBe("");
    }
  });

  it("neexistující den vrátí prázdno, ne chybu", () => {
    expect(jmeninyNa(2, 30)).toBe("");
    expect(jmeninyNa(13, 1)).toBe("");
  });

  it("jmeniny dne berou dnešek", () => {
    expect(jmeninyDne(new Date(2026, 7, 27))).toBe(jmeninyNa(8, 27));
  });
});

describe("nejbližší svátky", () => {
  const dnes = new Date(2026, 7, 27); // 27. 8. — Otakar

  it("najde dnešní jmeniny", () => {
    const v = nejblizsiSvatky([{ id: "1", jmeno: "Otakar Novák" }], 14, dnes);
    expect(v).toHaveLength(1);
    expect(v[0].zaDni).toBe(0);
  });

  it("porovnává jen křestní jméno", () => {
    const v = nejblizsiSvatky([{ id: "1", jmeno: "Otakar" }], 14, dnes);
    expect(v).toHaveLength(1);
  });

  it("diakritika nevadí", () => {
    // 30. 8. je Vladěna.
    const v = nejblizsiSvatky([{ id: "1", jmeno: "Vladena" }], 14, dnes);
    expect(v[0]?.zaDni).toBe(3);
  });

  it("datum s víc jmény najde obě", () => {
    // 24. 12. je Adam a Eva.
    const vanoce = new Date(2026, 11, 24);
    const v = nejblizsiSvatky(
      [{ id: "1", jmeno: "Adam" }, { id: "2", jmeno: "Eva" }], 0, vanoce
    );
    expect(v).toHaveLength(2);
  });

  it("dál než okno nehlásí", () => {
    const v = nejblizsiSvatky([{ id: "1", jmeno: "Vladena" }], 1, dnes);
    expect(v).toHaveLength(0);
  });

  it("neznámé jméno nic nevrátí", () => {
    expect(nejblizsiSvatky([{ id: "1", jmeno: "Xyzabc" }], 30, dnes)).toEqual([]);
  });

  it("prázdný seznam nespadne", () => {
    expect(nejblizsiSvatky([], 14, dnes)).toEqual([]);
  });
});
