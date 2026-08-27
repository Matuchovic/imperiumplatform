import { describe, it, expect } from "vitest";
import { druhSouboru, pripona, lzePrehlednout, rozpadniCsv, BARVA, IKONA } from "@/lib/betmail/prilohy";

describe("druh souboru", () => {
  it("pozná běžné typy", () => {
    expect(druhSouboru("smlouva.pdf")).toBe("pdf");
    expect(druhSouboru("data.XLSX")).toBe("tabulka");
    expect(druhSouboru("foto.jpeg")).toBe("obrazek");
    expect(druhSouboru("poznamky.md")).toBe("text");
  });

  it("neznámý typ spadne do jiné", () => {
    expect(druhSouboru("zaloha.zip")).toBe("jine");
    expect(druhSouboru("README")).toBe("jine");
  });

  it("skrytý soubor nemá příponu", () => {
    expect(pripona(".gitignore")).toBe("");
  });

  it("jen známé typy jdou zobrazit", () => {
    expect(lzePrehlednout("a.pdf")).toBe(true);
    expect(lzePrehlednout("a.zip")).toBe(false);
  });

  it("každý druh má barvu i ikonu", () => {
    for (const d of ["pdf", "obrazek", "tabulka", "text", "jine"] as const) {
      expect(BARVA[d]).toMatch(/^#/);
      expect(IKONA[d].length).toBeGreaterThan(0);
    }
  });
});

describe("rozpad CSV", () => {
  it("čárka i středník", () => {
    expect(rozpadniCsv("a,b,c\n1,2,3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(rozpadniCsv("a;b;c\n1;2;3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });

  it("oddělovač se pozná z hlavičky", () => {
    // Středníků je v hlavičce víc, takže vyhrává.
    expect(rozpadniCsv('jmeno;popis\nJan;"a, b, c"')).toEqual([
      ["jmeno", "popis"], ["Jan", "a, b, c"],
    ]);
  });

  it("uvozovky chrání oddělovač uvnitř pole", () => {
    expect(rozpadniCsv('a,b\n"prvni, druhy",treti')).toEqual([
      ["a", "b"], ["prvni, druhy", "treti"],
    ]);
  });

  it("zdvojená uvozovka je jedna uvozovka", () => {
    expect(rozpadniCsv('a\n"rekl ""ahoj"""')).toEqual([["a"], ['rekl "ahoj"']]);
  });

  it("zalomení uvnitř uvozovek nerozdělí řádek", () => {
    expect(rozpadniCsv('a,b\n"prvni\ndruhy",x')).toEqual([
      ["a", "b"], ["prvni\ndruhy", "x"],
    ]);
  });

  it("windowsové konce řádků", () => {
    expect(rozpadniCsv("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("prázdné řádky se zahodí", () => {
    expect(rozpadniCsv("a,b\n\n1,2\n\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("prázdný vstup nespadne", () => {
    expect(rozpadniCsv("")).toEqual([]);
  });
});
