import { describe, it, expect } from "vitest";
import { jeTicho, nazevZarizeni, DRUHY, VYCHOZI_VOLBY } from "@/lib/push/druhy";

const v = (h: number, m = 0) => {
  const d = new Date(2026, 7, 27);
  d.setHours(h, m, 0, 0);
  return d;
};

describe("tiché hodiny", () => {
  it("bez nastavení neplatí", () => {
    expect(jeTicho(null, null, v(3))).toBe(false);
    expect(jeTicho("22:00", null, v(23))).toBe(false);
  });

  it("běžný rozsah v rámci dne", () => {
    expect(jeTicho("09:00", "17:00", v(12))).toBe(true);
    expect(jeTicho("09:00", "17:00", v(8))).toBe(false);
    expect(jeTicho("09:00", "17:00", v(18))).toBe(false);
  });

  it("rozsah přes půlnoc platí na obou stranách", () => {
    // 22:00–07:00 musí zahrnout večer i ráno.
    expect(jeTicho("22:00", "07:00", v(23))).toBe(true);
    expect(jeTicho("22:00", "07:00", v(3))).toBe(true);
    expect(jeTicho("22:00", "07:00", v(12))).toBe(false);
  });

  it("hranice: začátek patří dovnitř, konec ven", () => {
    expect(jeTicho("22:00", "07:00", v(22, 0))).toBe(true);
    expect(jeTicho("22:00", "07:00", v(7, 0))).toBe(false);
    expect(jeTicho("22:00", "07:00", v(6, 59))).toBe(true);
  });
});

describe("název zařízení", () => {
  it("pozná běžné systémy", () => {
    expect(nazevZarizeni("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("iPhone");
    expect(nazevZarizeni("Mozilla/5.0 (Macintosh; Intel Mac OS X)")).toBe("Mac");
    expect(nazevZarizeni("Mozilla/5.0 (Linux; Android 14)")).toBe("Android");
  });

  it("iPad se nezamění za Mac", () => {
    expect(nazevZarizeni("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("iPad");
  });

  it("neznámé nespadne", () => {
    expect(nazevZarizeni("")).toBe("neznámé zařízení");
  });
});

describe("druhy notifikací", () => {
  it("každý druh má výchozí hodnotu ve VYCHOZI_VOLBY", () => {
    for (const d of DRUHY) {
      expect(VYCHOZI_VOLBY[d.klic], d.klic).toBe(d.vychozi);
    }
  });

  it("asistent je vypnutý — chodí častěji než ostatní", () => {
    expect(VYCHOZI_VOLBY.asistent).toBe(false);
  });

  it("klíče jsou jedinečné", () => {
    const klice = DRUHY.map((d) => d.klic);
    expect(new Set(klice).size).toBe(klice.length);
  });
});
