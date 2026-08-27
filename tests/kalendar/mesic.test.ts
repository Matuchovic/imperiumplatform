import { describe, it, expect } from "vitest";
import { mrizka, posunMesic, cas, rozsah, nazevMesice, DNY } from "@/lib/kalendar/mesic";

describe("měsíční mřížka", () => {
  it("vždy začíná pondělím", () => {
    // Srpen 2026 začíná v sobotu — mřížka musí začít o pět dní dřív.
    const m = mrizka(2026, 7, "2026-08-27");
    expect(m[0].datum).toBe("2026-07-27");
  });

  it("má celé týdny", () => {
    for (const mesic of [0, 1, 4, 8, 11]) {
      expect(mrizka(2026, mesic, "2026-08-27").length % 7).toBe(0);
    }
  });

  it("označí dnešek", () => {
    const m = mrizka(2026, 7, "2026-08-27");
    const dnesni = m.filter((d) => d.dnes);
    expect(dnesni).toHaveLength(1);
    expect(dnesni[0].datum).toBe("2026-08-27");
  });

  it("dny z jiného měsíce jsou označené", () => {
    const m = mrizka(2026, 7, "2026-08-27");
    expect(m.filter((d) => !d.jinyMesic)).toHaveLength(31);
  });

  it("víkendy sedí na sobotu a neděli", () => {
    const m = mrizka(2026, 7, "2026-08-27");
    // Šestý a sedmý sloupec každého týdne.
    m.forEach((d, i) => {
      const sloupec = i % 7;
      expect(d.vikend, d.datum).toBe(sloupec === 5 || sloupec === 6);
    });
  });

  it("únor v přestupném roce má 29 dní", () => {
    expect(mrizka(2028, 1, "2028-02-01").filter((d) => !d.jinyMesic)).toHaveLength(29);
  });

  it("zkratky dnů začínají pondělkem", () => {
    expect(DNY[0]).toBe("po");
    expect(DNY[6]).toBe("ne");
  });
});

describe("posun měsíce", () => {
  it("dopředu i dozadu", () => {
    expect(posunMesic(2026, 7, 1)).toEqual({ rok: 2026, mesic: 8 });
    expect(posunMesic(2026, 7, -1)).toEqual({ rok: 2026, mesic: 6 });
  });

  it("přes hranici roku", () => {
    expect(posunMesic(2026, 11, 1)).toEqual({ rok: 2027, mesic: 0 });
    expect(posunMesic(2026, 0, -1)).toEqual({ rok: 2025, mesic: 11 });
  });
});

describe("čas události", () => {
  it("celý den má přednost před časem", () => {
    expect(cas("09:00:00", "11:00:00", true)).toBe("celý den");
  });

  it("rozsah i jediný čas", () => {
    expect(cas("09:00:00", "11:30:00", false)).toBe("09:00 – 11:30");
    expect(cas("14:00:00", null, false)).toBe("14:00");
  });

  it("bez času vrátí prázdno", () => {
    expect(cas(null, null, false)).toBe("");
  });
});

describe("rozsah měsíce", () => {
  it("od prvního do posledního dne", () => {
    expect(rozsah(2026, 7)).toEqual({ od: "2026-08-01", do: "2026-08-31" });
    expect(rozsah(2026, 1)).toEqual({ od: "2026-02-01", do: "2026-02-28" });
  });

  it("název měsíce je česky", () => {
    expect(nazevMesice(2026, 7)).toBe("srpen 2026");
  });
});
