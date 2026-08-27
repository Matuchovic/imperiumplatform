import { describe, it, expect } from "vitest";
import { utrzek, predmetOdpovedi, predmetPreposlani, kdy, REAKCE, PRIORITY } from "@/lib/betmail/typy";

describe("útržek", () => {
  it("krátký text projde celý", () => {
    expect(utrzek("Ahoj")).toBe("Ahoj");
  });

  it("dlouhý se zkrátí s výpustkou", () => {
    const v = utrzek("a".repeat(200));
    expect(v.length).toBeLessThanOrEqual(111);
    expect(v.endsWith("…")).toBe(true);
  });

  it("zalomení a mezery se sloučí", () => {
    expect(utrzek("první\n\n  druhý")).toBe("první druhý");
  });

  it("nekončí mezerou před výpustkou", () => {
    expect(utrzek("slovo ".repeat(40))).not.toContain(" …");
  });
});

describe("předměty", () => {
  it("odpověď dostane předponu", () => {
    expect(predmetOdpovedi("Faktura")).toBe("Re: Faktura");
  });

  it("předpony se nehromadí", () => {
    // „Re: Re: Re:" nikdo číst nechce.
    expect(predmetOdpovedi("Re: Faktura")).toBe("Re: Faktura");
    expect(predmetOdpovedi("RE: Faktura")).toBe("RE: Faktura");
  });

  it("přeposlání má vlastní předponu", () => {
    expect(predmetPreposlani("Faktura")).toBe("Fwd: Faktura");
    expect(predmetPreposlani("Fwd: Faktura")).toBe("Fwd: Faktura");
  });
});

describe("čas zprávy", () => {
  const ted = new Date(2026, 7, 27, 15, 30);

  it("dnes ukáže čas", () => {
    const d = new Date(2026, 7, 27, 9, 5);
    expect(kdy(d.toISOString(), ted)).toMatch(/^0?9:05$/);
  });

  it("včera se pojmenuje", () => {
    expect(kdy(new Date(2026, 7, 26, 9).toISOString(), ted)).toBe("včera");
  });

  it("dřív ukáže datum", () => {
    expect(kdy(new Date(2026, 7, 20).toISOString(), ted)).toBe("20. 8.");
  });

  it("stejný den v jiném roce není dnes", () => {
    expect(kdy(new Date(2025, 7, 27, 9).toISOString(), ted)).not.toMatch(/:/);
  });
});

describe("reakce a priority", () => {
  it("reakcí je šest — dost na výběr, málo na váhání", () => {
    expect(REAKCE).toHaveLength(6);
    expect(new Set(REAKCE).size).toBe(6);
  });

  it("priority mají jedinečné klíče", () => {
    const k = PRIORITY.map((p) => p.klic);
    expect(new Set(k).size).toBe(k.length);
  });
});
