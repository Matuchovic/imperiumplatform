import { describe, it, expect } from "vitest";
import { VETY, klicNahravky, znakuCelkem, type Vysloveni } from "@/lib/hlas/vety";

const DRUHY = Object.keys(VETY) as Vysloveni[];

describe("věty", () => {
  it("každá je krátká — dlouhé hlášení se přes upozornění nedoposlouchá", () => {
    for (const d of DRUHY) {
      expect(VETY[d].length, d).toBeLessThanOrEqual(45);
      expect(VETY[d].length).toBeGreaterThan(3);
    }
  });

  it("končí tečkou, ať má hlas kam klesnout", () => {
    for (const d of DRUHY) {
      expect(VETY[d].endsWith("."), d).toBe(true);
    }
  });

  it("žádné dvě nejsou stejné", () => {
    const texty = Object.values(VETY);
    expect(new Set(texty).size).toBe(texty.length);
  });

  it("celkem se generuje málo znaků", () => {
    // Deset vět kolem třiceti znaků. Jednorázová útrata pár korun.
    expect(znakuCelkem()).toBeLessThan(400);
  });
});

describe("klíč nahrávky", () => {
  it("stejná věta a hlas dají stejný klíč", () => {
    expect(klicNahravky("posta", "abc123")).toBe(klicNahravky("posta", "abc123"));
  });

  it("jiný hlas dá jiný klíč", () => {
    expect(klicNahravky("posta", "abc123")).not.toBe(klicNahravky("posta", "xyz789"));
  });

  it("jiná věta dá jiný klíč", () => {
    expect(klicNahravky("posta", "abc")).not.toBe(klicNahravky("ukol", "abc"));
  });

  it("klíč je bezpečný pro úložiště", () => {
    for (const d of DRUHY) {
      const k = klicNahravky(d, "hlas-1");
      expect(k).toMatch(/^[a-z0-9-]+\.mp3$/i);
      expect(k.length).toBeLessThan(60);
    }
  });
});
