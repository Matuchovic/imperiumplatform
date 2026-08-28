import { describe, it, expect } from "vitest";
import {
  OPRAVNENI, VSECHNA_OPRAVNENI, NIKDY, platneOpravneni, maZapis,
  otisk, domenaSedi, vyprsel, stavKlice,
} from "@/lib/apiklice/klice";

describe("oprávnění", () => {
  it("každé má název, popis a příznak zápisu", () => {
    for (const [k, o] of Object.entries(OPRAVNENI)) {
      expect(o.nazev.length, k).toBeGreaterThan(3);
      expect(o.popis.length, k).toBeGreaterThan(10);
      expect(typeof o.zapis, k).toBe("boolean");
    }
  });

  it("žádné oprávnění nesahá na peníze ani na hesla", () => {
    // Kdyby někdo přidal takový klíč, tenhle test spadne.
    const zakazane = /bankroll|trezor|heslo|vyplat|faktur|role|kampan/i;
    for (const k of VSECHNA_OPRAVNENI) {
      expect(zakazane.test(k), `oprávnění ${k} sahá tam, kam nemá`).toBe(false);
    }
  });

  it("prázdný seznam není platný", () => {
    expect(platneOpravneni([])).toBe(false);
  });

  it("neznámé oprávnění projít nesmí", () => {
    expect(platneOpravneni(["vyplaty:zapis"])).toBe(false);
    expect(platneOpravneni(["kontakty:zapis", "nesmysl"])).toBe(false);
  });

  it("platná kombinace projde", () => {
    expect(platneOpravneni(["kontakty:zapis", "statistiky:cteni"])).toBe(true);
  });

  it("zápis se pozná", () => {
    expect(maZapis(["statistiky:cteni"])).toBe(false);
    expect(maZapis(["statistiky:cteni", "kontakty:zapis"])).toBe(true);
  });

  it("seznam zakázaného není prázdný", () => {
    expect(NIKDY.length).toBeGreaterThanOrEqual(3);
  });
});

describe("otisk", () => {
  it("ukáže začátek a konec, zbytek skryje", () => {
    const k = "bi_live_9k4Rm2xQvT8nZpL6yW3eH7sA1bF5jD0cU9gK4tN2";
    const o = otisk(k);
    expect(o.startsWith("bi_live_9k4R")).toBe(true);
    expect(o.endsWith("4tN2")).toBe(true);
    expect(o).toContain("•");
  });

  it("z otisku nejde klíč složit", () => {
    const k = "bi_live_9k4Rm2xQvT8nZpL6yW3eH7sA1bF5jD0cU9gK4tN2";
    const o = otisk(k);
    // Viditelných je 16 znaků z 49 — zbytek zůstává tajný.
    const videt = o.replace(/•/g, "").length;
    expect(videt).toBeLessThan(k.length / 2);
  });

  it("krátký řetězec se skryje celý", () => {
    expect(otisk("abc")).toBe("•••");
  });
});

describe("omezení domény", () => {
  it("přesná shoda", () => {
    expect(domenaSedi(["www.bet-imperium.cz"], "https://www.bet-imperium.cz")).toBe(true);
    expect(domenaSedi(["www.bet-imperium.cz"], "https://bet-imperium.cz")).toBe(false);
  });

  it("port a cesta nevadí", () => {
    expect(domenaSedi(["localhost"], "http://localhost:3000/api")).toBe(true);
  });

  it("hvězdička bere právě jednu úroveň", () => {
    expect(domenaSedi(["*.vercel.app"], "https://nas-web.vercel.app")).toBe(true);
    expect(domenaSedi(["*.vercel.app"], "https://a.b.vercel.app")).toBe(false);
  });

  it("podvržená doména neprojde", () => {
    // Kdyby hvězdička brala libovolný počet úrovní, tohle by prošlo.
    expect(domenaSedi(["*.bet-imperium.cz"], "https://zlo.bet-imperium.cz.utocnik.cz")).toBe(false);
    expect(domenaSedi(["bet-imperium.cz"], "https://bet-imperium.cz.utocnik.cz")).toBe(false);
  });

  it("velikost písmen nerozhoduje", () => {
    expect(domenaSedi(["Bet-Imperium.CZ"], "https://BET-IMPERIUM.cz")).toBe(true);
  });

  it("bez původu neprojde nic, když je omezení nastavené", () => {
    expect(domenaSedi(["bet-imperium.cz"], null)).toBe(false);
  });

  it("prázdné omezení pustí vše", () => {
    expect(domenaSedi([], null)).toBe(true);
  });

  it("nesmyslný původ neprojde", () => {
    expect(domenaSedi(["bet-imperium.cz"], "tohle-není-url")).toBe(false);
  });
});

describe("stav klíče", () => {
  const ted = new Date(2026, 7, 27);
  const zaklad = { odvolany_at: null, plati_do: null, posledni_pouziti: null };
  const pred = (dni: number) =>
    new Date(ted.getTime() - dni * 864e5).toISOString();

  it("odvolaný má přednost před vším", () => {
    expect(stavKlice({ ...zaklad, odvolany_at: pred(1), plati_do: pred(100) }, ted)).toBe("odvolany");
  });

  it("vypršelý se pozná", () => {
    expect(stavKlice({ ...zaklad, plati_do: pred(1) }, ted)).toBe("vyprsel");
    expect(vyprsel(pred(1), ted)).toBe(true);
    expect(vyprsel(null, ted)).toBe(false);
  });

  it("nepoužitý přes dva týdny je spící", () => {
    expect(stavKlice({ ...zaklad, posledni_pouziti: pred(20) }, ted)).toBe("spici");
    expect(stavKlice({ ...zaklad, posledni_pouziti: pred(3) }, ted)).toBe("aktivni");
  });

  it("nikdy nepoužitý čerstvý klíč je aktivní", () => {
    expect(stavKlice(zaklad, ted)).toBe("aktivni");
  });
});
