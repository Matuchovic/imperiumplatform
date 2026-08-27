import { describe, it, expect } from "vitest";
import {
  KATALOG, agentPodleKlice, BARVY_STAVU, pristiBeh, zaJakDlouho, jakDavno,
} from "@/lib/agenti/katalog";

describe("katalog", () => {
  it("každý agent má klíč, který se neopakuje", () => {
    const klice = KATALOG.map((a) => a.klic);
    expect(new Set(klice).size).toBe(klice.length);
  });

  it("každý má důvod existence", () => {
    // Bez toho je to seznam funkcí, ne agent.
    for (const a of KATALOG) {
      expect(a.proc.length, a.klic).toBeGreaterThan(40);
    }
  });

  it("každý má hranice", () => {
    for (const a of KATALOG) {
      expect(a.nesmi.length, a.klic).toBeGreaterThanOrEqual(2);
    }
  });

  it("nikdo nesmí jednat bez schválení", () => {
    // Pravidlo celé garáže. Kdyby ho někdo obešel, test spadne.
    for (const a of KATALOG) {
      const hranice = a.nesmi.join(" ").toLowerCase();
      const jednaSam = /neposílá|nepublikuje|neodesílá|neodpovídá sám|nekontaktuje/.test(hranice);
      expect(jednaSam, `${a.klic} nemá hranici proti samostatnému jednání`).toBe(true);
    }
  });

  it("barva je platná", () => {
    for (const a of KATALOG) expect(a.barva).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("hledání podle klíče", () => {
    expect(agentPodleKlice("retence")?.nazev).toBe("Retenční agent");
    expect(agentPodleKlice("nesmysl")).toBeUndefined();
  });

  it("každý stav má název i barvu", () => {
    for (const s of Object.values(BARVY_STAVU)) {
      expect(s.nazev.length).toBeGreaterThan(0);
      expect(s.barva).toMatch(/^#/);
    }
  });
});

describe("plánování běhů", () => {
  const ted = new Date(2026, 7, 27, 12, 0);

  it("bez intervalu se spouští ručně", () => {
    expect(pristiBeh(null, null)).toBeNull();
    expect(zaJakDlouho(null)).toBe("ručně");
  });

  it("příští běh od posledního", () => {
    const p = pristiBeh("2026-08-27T12:00:00Z", 60)!;
    expect(p.getTime() - new Date("2026-08-27T12:00:00Z").getTime()).toBe(3_600_000);
  });

  it("za jak dlouho se skloňuje", () => {
    const za = (min: number) => zaJakDlouho(new Date(ted.getTime() + min * 60_000), ted);
    expect(za(30)).toBe("za 30 min");
    expect(za(60)).toBe("za 1 hodinu");
    expect(za(180)).toBe("za 3 hodiny");
    expect(za(360)).toBe("za 6 hodin");
  });

  it("propadlý termín neříká záporné číslo", () => {
    expect(zaJakDlouho(new Date(ted.getTime() - 60_000), ted)).toBe("každou chvíli");
  });

  it("jak dávno se skloňuje", () => {
    const pred = (min: number) => jakDavno(new Date(ted.getTime() - min * 60_000).toISOString(), ted);
    expect(pred(0)).toBe("právě teď");
    expect(pred(40)).toBe("před 40 min");
    expect(pred(120)).toBe("před 2 h");
    expect(pred(60 * 24)).toBe("před 1 dnem");
    expect(pred(60 * 72)).toBe("před 3 dny");
  });

  it("nikdy neběžel", () => {
    expect(jakDavno(null)).toBe("nikdy");
  });
});
