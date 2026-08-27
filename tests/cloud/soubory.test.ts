import { describe, it, expect } from "vitest";
import { velikost, pripona, ikona, bezpecnyNazev, cestaVUlozisti } from "@/lib/cloud/soubory";

describe("velikost", () => {
  it("škáluje jednotky", () => {
    expect(velikost(512)).toBe("512 B");
    expect(velikost(2048)).toBe("2 kB");
    expect(velikost(1024 * 1024 * 3.5)).toBe("3.5 MB");
    expect(velikost(1024 * 1024 * 1024 * 2)).toBe("2.0 GB");
  });

  it("desetinné místo jen u malých MB", () => {
    // U 150 MB je desetina k ničemu, u 3,5 MB nese informaci.
    expect(velikost(1024 * 1024 * 150)).toBe("150 MB");
  });

  it("nula a záporné nespadnou", () => {
    expect(velikost(0)).toBe("0 B");
    expect(velikost(-5)).toBe("0 B");
  });
});

describe("přípona a ikona", () => {
  it("pozná běžné typy", () => {
    expect(ikona("smlouva.pdf")).toBe("file-type-pdf");
    expect(ikona("data.XLSX")).toBe("file-type-xls");
    expect(ikona("foto.jpeg")).toBe("photo");
    expect(ikona("zaloha.tar.gz")).toBe("file-zip");
  });

  it("složka má vlastní ikonu bez ohledu na název", () => {
    expect(ikona("smlouvy.pdf", true)).toBe("folder");
  });

  it("bez přípony vrací obecnou ikonu", () => {
    expect(ikona("README")).toBe("file");
    expect(pripona("README")).toBe("");
  });

  it("skrytý soubor není přípona", () => {
    expect(pripona(".gitignore")).toBe("");
  });
});

describe("bezpečný název", () => {
  it("odstraní diakritiku", () => {
    expect(bezpecnyNazev("příliš žluťoučký.pdf")).toBe("prilis-zlutoucky.pdf");
  });

  it("mezery a zvláštní znaky nahradí pomlčkou", () => {
    expect(bezpecnyNazev("Smlouva #12 (finální).pdf")).toBe("Smlouva-12-finalni-.pdf");
  });

  it("nezačíná ani nekončí pomlčkou", () => {
    const v = bezpecnyNazev("!!! test !!!");
    expect(v.startsWith("-")).toBe(false);
    expect(v.endsWith("-")).toBe(false);
  });

  it("prázdný název dá náhradu", () => {
    expect(bezpecnyNazev("!!!")).toBe("soubor");
    expect(bezpecnyNazev("")).toBe("soubor");
  });

  it("dlouhý název se ořízne", () => {
    expect(bezpecnyNazev("a".repeat(300)).length).toBeLessThanOrEqual(120);
  });
});

describe("cesta v úložišti", () => {
  it("obsahuje rok, měsíc a náhodnou předponu", () => {
    const c = cestaVUlozisti("smlouva.pdf");
    expect(c).toMatch(/^\d{4}\/\d{2}\/[a-z0-9]{8}-smlouva\.pdf$/);
  });

  it("dvě volání dají různé cesty", () => {
    // Bez náhodné předpony by dva soubory téhož jména kolidovaly
    // a druhý by přepsal první.
    expect(cestaVUlozisti("a.pdf")).not.toBe(cestaVUlozisti("a.pdf"));
  });
});
