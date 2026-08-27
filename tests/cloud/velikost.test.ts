import { describe, it, expect } from "vitest";
import { velikost, cestaProUlozeni, pripona, ikonaSouboru, zaplneno } from "@/lib/cloud/velikost";

describe("velikost", () => {
  it("převádí na správné jednotky", () => {
    expect(velikost(0)).toBe("0 B");
    expect(velikost(512)).toBe("512 B");
    expect(velikost(1024)).toBe("1 kB");
    expect(velikost(1536)).toBe("1,5 kB");
    expect(velikost(1024 ** 2)).toBe("1 MB");
    expect(velikost(1024 ** 3 * 2.5)).toBe("2,5 GB");
  });

  it("desetinná čárka, ne tečka", () => {
    expect(velikost(1536)).toContain(",");
    expect(velikost(1536)).not.toContain(".");
  });

  it("nesmysl nespadne", () => {
    for (const x of [-1, NaN, Infinity]) expect(velikost(x)).toBe("0 B");
  });
});

describe("cesta v úložišti", () => {
  it("nepoužívá původní název", () => {
    // Diakritika a mezery v cestách dělají potíže.
    const c = cestaProUlozeni("Smlouva — Novák (2026).pdf");
    expect(c).not.toContain("Smlouva");
    expect(c).not.toContain(" ");
    expect(c).toMatch(/^[a-z0-9-]+\.pdf$/);
  });

  it("zachová příponu malými písmeny", () => {
    expect(cestaProUlozeni("a.PDF")).toMatch(/\.pdf$/);
    expect(cestaProUlozeni("b.XlSx")).toMatch(/\.xlsx$/);
  });

  it("bez přípony taky projde", () => {
    expect(cestaProUlozeni("README")).toMatch(/^[a-z0-9-]+$/);
  });

  it("dvě volání nikdy nedají stejnou cestu", () => {
    const sada = new Set(Array.from({ length: 200 }, () => cestaProUlozeni("x.pdf")));
    expect(sada.size).toBe(200);
  });

  it("lomítko se do cesty nedostane", () => {
    expect(cestaProUlozeni("../../etc/passwd.txt")).not.toContain("/");
  });
});

describe("přípona a ikona", () => {
  it("čte poslední tečku", () => {
    expect(pripona("a.b.pdf")).toBe("pdf");
    expect(pripona("bez")).toBe("");
    expect(pripona(".skryty")).toBe("");
  });

  it("známé typy mají svou ikonu", () => {
    expect(ikonaSouboru("x.pdf")).toBe("file-type-pdf");
    expect(ikonaSouboru("x.jpg")).toBe("photo");
    expect(ikonaSouboru("x.neznamy")).toBe("file");
  });
});

describe("zaplnění kvóty", () => {
  it("počítá procenta", () => {
    expect(zaplneno(1024 ** 3, 20)).toBe(5);
    expect(zaplneno(1024 ** 3 * 10, 20)).toBe(50);
  });

  it("nikdy nepřeteče přes sto", () => {
    expect(zaplneno(1024 ** 3 * 100, 20)).toBe(100);
  });

  it("nulová kvóta nespadne na dělení nulou", () => {
    expect(zaplneno(1000, 0)).toBe(0);
  });
});
