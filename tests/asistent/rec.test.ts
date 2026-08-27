import { describe, it, expect } from "vitest";
import { ocistiPrepis, jeSmysluplne, nahledPrepisu } from "@/lib/asistent/rec";

describe("očištění přepisu", () => {
  it("velké písmeno na začátku", () => {
    expect(ocistiPrepis("kdo dnes potřebuje pozornost")).toBe("Kdo dnes potřebuje pozornost");
  });

  it("mezery navíc pryč", () => {
    expect(ocistiPrepis("  jak   si   vede  Procházka ")).toBe("Jak si vede Procházka");
  });

  it("diktovaná tečka je tečka", () => {
    expect(ocistiPrepis("založ úkol tečka")).toBe("Založ úkol.");
  });

  it("diktovaný otazník taky", () => {
    expect(ocistiPrepis("kolik máme klientů otazník")).toBe("Kolik máme klientů?");
  });

  it("čárka uprostřed", () => {
    expect(ocistiPrepis("zavolej Petrovi čárka pak Adamovi"))
      .toBe("Zavolej Petrovi, pak Adamovi");
  });

  it("mezera před interpunkcí zmizí", () => {
    expect(ocistiPrepis("hotovo tečka")).not.toContain(" .");
  });

  it("prázdný vstup nespadne", () => {
    expect(ocistiPrepis("")).toBe("");
    expect(ocistiPrepis("   ")).toBe("");
  });
});

describe("má smysl odeslat", () => {
  it("skutečný dotaz ano", () => {
    expect(jeSmysluplne("Kdo dnes potřebuje pozornost")).toBe(true);
    expect(jeSmysluplne("Založ úkol zavolat Procházkovi")).toBe(true);
  });

  it("citoslovce ne", () => {
    for (const s of ["ehm", "hm", "hmm", "aha", "jo", "ok", "jasně"]) {
      expect(jeSmysluplne(s), s).toBe(false);
    }
  });

  it("příliš krátké ne", () => {
    expect(jeSmysluplne("a")).toBe(false);
    expect(jeSmysluplne("")).toBe(false);
  });

  it("samá jednopísmenná slova ne", () => {
    expect(jeSmysluplne("a b c")).toBe(false);
  });

  it("krátký, ale platný dotaz ano", () => {
    expect(jeSmysluplne("Kolik klientů")).toBe(true);
  });
});

describe("náhled přepisu", () => {
  it("krátký projde celý", () => {
    expect(nahledPrepisu("Kdo dnes")).toBe("Kdo dnes");
  });

  it("dlouhý ukáže konec — tam se právě mluví", () => {
    const v = nahledPrepisu("a".repeat(200), 50);
    expect(v.startsWith("…")).toBe(true);
    expect(v.length).toBe(51);
  });
});

/**
 * Odpočet ticha.
 *
 * Logika je v posloucham.ts svázaná s prohlížečem, ale pravidlo
 * jde ověřit samostatně: odpočet musí běžet i z průběžného přepisu,
 * jinak Safari odeslání nikdy nespustí.
 */
describe("kdy odeslat", () => {
  const maBezetOdpocet = (sebrano: string, castecne: string): boolean =>
    Boolean((sebrano + castecne).trim());

  it("běží i bez uzavřené věty", () => {
    // Safari při souvislém poslechu často neuzavře nic.
    expect(maBezetOdpocet("", "kdo dnes potřebuje")).toBe(true);
  });

  it("běží z uzavřené věty", () => {
    expect(maBezetOdpocet("kdo dnes potřebuje ", "")).toBe(true);
  });

  it("běží z obojího", () => {
    expect(maBezetOdpocet("kdo dnes ", "potřebuje pozornost")).toBe(true);
  });

  it("neběží, dokud se nic neřeklo", () => {
    expect(maBezetOdpocet("", "")).toBe(false);
    expect(maBezetOdpocet("  ", " ")).toBe(false);
  });
});
