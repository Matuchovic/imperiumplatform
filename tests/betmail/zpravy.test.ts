import { describe, it, expect } from "vitest";
import {
  kdyZprava, nahled, predmetOdpovedi, predmetPreposlani, SLOZKY, REAKCE,
} from "@/lib/betmail/zpravy";

const ted = new Date(2026, 7, 27, 14, 30);
const kdy = (d: number, h = 9, m = 15) => new Date(2026, 7, d, h, m).toISOString();

describe("čas zprávy", () => {
  it("dnešní ukáže hodinu", () => {
    expect(kdyZprava(kdy(27, 9, 5), ted)).toBe("09:05");
  });

  it("včerejší řekne včera", () => {
    expect(kdyZprava(kdy(26), ted)).toBe("včera 09:15");
  });

  it("tenhle týden den v týdnu", () => {
    // 24. 8. 2026 je pondělí.
    expect(kdyZprava(kdy(24), ted)).toContain("po");
  });

  it("starší v tomhle roce datum bez roku", () => {
    expect(kdyZprava(new Date(2026, 2, 5).toISOString(), ted)).toBe("5. 3.");
  });

  it("loňské plné datum", () => {
    expect(kdyZprava(new Date(2025, 2, 5).toISOString(), ted)).toContain("2025");
  });
});

describe("náhled", () => {
  it("krátký text projde beze změny", () => {
    expect(nahled("Krátká zpráva.")).toBe("Krátká zpráva.");
  });

  it("zalomení a mezery se srovnají", () => {
    expect(nahled("První řádek\n\n   druhý")).toBe("První řádek druhý");
  });

  it("dlouhý se zkrátí a nekončí mezerou", () => {
    const v = nahled("slovo ".repeat(50), 30);
    expect(v.length).toBeLessThanOrEqual(31);
    expect(v.endsWith("…")).toBe(true);
    expect(v).not.toContain(" …");
  });
});

describe("předměty", () => {
  it("Re: se nehromadí", () => {
    expect(predmetOdpovedi("Faktura")).toBe("Re: Faktura");
    expect(predmetOdpovedi("Re: Faktura")).toBe("Re: Faktura");
    expect(predmetOdpovedi("RE: Faktura")).toBe("RE: Faktura");
  });

  it("přeposlání zahodí Re:", () => {
    // „Fwd: Re: Re: Faktura" je nečitelné.
    expect(predmetPreposlani("Re: Faktura")).toBe("Fwd: Faktura");
    expect(predmetPreposlani("Faktura")).toBe("Fwd: Faktura");
    expect(predmetPreposlani("Fwd: Faktura")).toBe("Fwd: Faktura");
  });
});

describe("složky a reakce", () => {
  it("doručené jsou první", () => {
    expect(SLOZKY[0].klic).toBe("dorucene");
  });

  it("reakcí je málo — vybere se rychleji", () => {
    expect(REAKCE.length).toBeLessThanOrEqual(8);
    expect(new Set(REAKCE).size).toBe(REAKCE.length);
  });
});
