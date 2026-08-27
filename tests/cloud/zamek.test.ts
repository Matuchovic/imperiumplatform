import { describe, it, expect } from "vitest";
import { platnyPin, otiskni, sedi, stavPokusu, dalsiBlokace, MAX_POKUSU } from "@/lib/cloud/zamek";

describe("platnost PINu", () => {
  it("bere přesně šest číslic", () => {
    expect(platnyPin("123456")).toBe(true);
    expect(platnyPin("000000")).toBe(true);
  });

  it("odmítne cokoli jiného", () => {
    for (const p of ["12345", "1234567", "12345a", "", "  1234", "12 3456"]) {
      expect(platnyPin(p), p).toBe(false);
    }
  });
});

describe("otisk PINu", () => {
  it("správný PIN projde", () => {
    const o = otiskni("482913");
    expect(sedi("482913", o)).toBe(true);
  });

  it("špatný PIN neprojde", () => {
    const o = otiskni("482913");
    expect(sedi("482914", o)).toBe(false);
    expect(sedi("000000", o)).toBe(false);
  });

  it("stejný PIN dá pokaždé jiný otisk", () => {
    // Bez soli by šlo z opakujících se otisků poznat,
    // že dva lidé mají stejný PIN.
    const a = otiskni("111111");
    const b = otiskni("111111");
    expect(a).not.toBe(b);
    expect(sedi("111111", a)).toBe(true);
    expect(sedi("111111", b)).toBe(true);
  });

  it("otisk neobsahuje PIN otevřeně", () => {
    expect(otiskni("482913")).not.toContain("482913");
  });

  it("poškozený otisk nespadne", () => {
    for (const o of ["", "abc", "a:b", ":", "sul:"]) {
      expect(sedi("482913", o)).toBe(false);
    }
  });
});

describe("ochrana proti hádání", () => {
  it("počítá zbývající pokusy", () => {
    expect(stavPokusu(0, null).zbyva).toBe(MAX_POKUSU);
    expect(stavPokusu(3, null).zbyva).toBe(MAX_POKUSU - 3);
    expect(stavPokusu(99, null).zbyva).toBe(0);
  });

  it("blokace v budoucnu drží, v minulosti ne", () => {
    const za5 = new Date(Date.now() + 5 * 60_000).toISOString();
    const pred5 = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(stavPokusu(5, za5).blokovano).toBe(true);
    expect(stavPokusu(5, pred5).blokovano).toBe(false);
  });

  it("blokace nastane až u posledního pokusu", () => {
    expect(dalsiBlokace(0)).toBeNull();
    expect(dalsiBlokace(MAX_POKUSU - 2)).toBeNull();
    expect(dalsiBlokace(MAX_POKUSU - 1)).not.toBeNull();
  });
});
