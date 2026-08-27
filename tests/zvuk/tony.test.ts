import { describe, it, expect } from "vitest";
import { MELODIE, VIBRACE, delkaMelodie, type Druh } from "@/lib/zvuk/tony";

const DRUHY: Druh[] = ["upozorneni", "zprava", "hotovo", "chyba", "jemne"];

describe("melodie", () => {
  it("každý druh má melodii i vzorec vibrace", () => {
    for (const d of DRUHY) {
      expect(MELODIE[d].length, d).toBeGreaterThan(0);
      expect(VIBRACE[d].length, d).toBeGreaterThan(0);
    }
  });

  it("jsou krátké — nad půl vteřiny už znělka obtěžuje", () => {
    for (const d of DRUHY) {
      expect(delkaMelodie(d), d).toBeLessThanOrEqual(0.5);
    }
  });

  it("hlasitost nikdy nepřekročí pětinu", () => {
    // Upozornění má doplnit obrazovku, ne přehlušit hovor.
    for (const d of DRUHY) {
      for (const t of MELODIE[d]) {
        expect(t.hlasitost, `${d} ${t.hz}Hz`).toBeLessThanOrEqual(0.2);
        expect(t.hlasitost).toBeGreaterThan(0);
      }
    }
  });

  it("tóny jsou ve slyšitelném pásmu", () => {
    for (const d of DRUHY) {
      for (const t of MELODIE[d]) {
        expect(t.hz).toBeGreaterThan(200);
        expect(t.hz).toBeLessThan(4000);
      }
    }
  });

  it("tóny na sebe navazují, nepřeskakují", () => {
    for (const d of DRUHY) {
      const razeno = [...MELODIE[d]].sort((a, b) => a.od - b.od);
      expect(razeno[0].od, d).toBe(0);
      for (let i = 1; i < razeno.length; i++) {
        // Mezera mezi tóny nesmí být větší než délka předchozího.
        const konec = razeno[i - 1].od + razeno[i - 1].delka;
        expect(razeno[i].od, `${d} tón ${i}`).toBeLessThanOrEqual(konec + 0.05);
      }
    }
  });

  it("chyba klesá, ostatní ne", () => {
    const prvni = MELODIE.chyba[0].hz;
    const posledni = MELODIE.chyba[MELODIE.chyba.length - 1].hz;
    expect(posledni).toBeLessThan(prvni);

    for (const d of ["upozorneni", "hotovo"] as Druh[]) {
      const m = MELODIE[d];
      expect(m[m.length - 1].hz, d).toBeGreaterThan(m[0].hz);
    }
  });

  it("zpráva je tišší než upozornění — chodí častěji", () => {
    const max = (d: Druh) => Math.max(...MELODIE[d].map((t) => t.hlasitost));
    expect(max("zprava")).toBeLessThan(max("upozorneni"));
    expect(max("jemne")).toBeLessThan(max("zprava"));
  });

  it("délka melodie sedí s posledním tónem", () => {
    expect(delkaMelodie("hotovo")).toBeCloseTo(0.3, 2);
    expect(delkaMelodie("jemne")).toBeCloseTo(0.08, 2);
  });
});
