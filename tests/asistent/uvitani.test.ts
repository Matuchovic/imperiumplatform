import { describe, it, expect } from "vitest";
import { vokativ, castDne, uvitani } from "@/lib/asistent/uvitani";

describe("vokativ", () => {
  it("jména na -a", () => {
    expect(vokativ("Ondra")).toBe("Ondro");
    expect(vokativ("Honza")).toBe("Honzo");
  });

  it("tvrdé souhlásky berou -e", () => {
    expect(vokativ("Jakub")).toBe("Jakube");
    expect(vokativ("Martin")).toBe("Martine");
    expect(vokativ("Pavel")).toBe("Pavele");
    expect(vokativ("Adam")).toBe("Adame");
  });

  it("sykavky berou -i", () => {
    expect(vokativ("Tomáš")).toBe("Tomáši");
    expect(vokativ("Denis")).toBe("Denisi");
    expect(vokativ("Luboš")).toBe("Luboši");
  });

  it("Petr má vlastní tvar", () => {
    expect(vokativ("Petr")).toBe("Petře");
  });

  it("jména na -ek vypouštějí e", () => {
    expect(vokativ("Marek")).toBe("Marku");
    expect(vokativ("Radek")).toBe("Radku");
  });

  it("měkké zakončení bere -i", () => {
    expect(vokativ("Ondřej")).toBe("Ondřeji");
  });

  it("bere jen křestní jméno", () => {
    expect(vokativ("Ondra Matucha")).toBe("Ondro");
  });

  it("neznámý tvar nechá být — špatný vokativ je horší než žádný", () => {
    expect(vokativ("Xyq")).toBe("Xyq");
    expect(vokativ("")).toBe("");
    expect(vokativ("A")).toBe("A");
  });
});

describe("část dne", () => {
  const v = (h: number) => castDne(new Date(2026, 7, 27, h));

  it("hranice sedí", () => {
    expect(v(2)).toBe("noc");
    expect(v(6)).toBe("rano");
    expect(v(10)).toBe("dopoledne");
    expect(v(15)).toBe("odpoledne");
    expect(v(21)).toBe("vecer");
  });
});

describe("uvítací věta", () => {
  const rano = new Date(2026, 7, 27, 7);

  it("bez práce řekne, že je čisto", () => {
    const v = uvitani("Ondra", {}, rano);
    expect(v).toContain("Dobré ráno, Ondro.");
    expect(v).toContain("Nic nečeká");
    expect(v).toContain("Co budeme dělat?");
  });

  it("jedna věc se skloňuje jednotně", () => {
    expect(uvitani("Ondra", { posta: 1 }, rano)).toContain("jedna nepřečtená zpráva");
  });

  it("dvě až čtyři mají vlastní tvar", () => {
    expect(uvitani("Ondra", { posta: 3 }, rano)).toContain("3 nepřečtené zprávy");
  });

  it("pět a víc taky", () => {
    expect(uvitani("Ondra", { posta: 7 }, rano)).toContain("7 nepřečtených zpráv");
  });

  it("víc věcí se spojí spojkou, ne čárkou", () => {
    const v = uvitani("Ondra", { posta: 2, faktury: 1 }, rano);
    expect(v).toContain(" a jedna faktura po splatnosti");
    expect(v).not.toContain(", jedna faktura");
  });

  it("tři věci: čárka, čárka, spojka", () => {
    const v = uvitani("Ondra", { posta: 2, ukoly: 1, faktury: 3 }, rano);
    expect(v.match(/,/g)?.length).toBe(2);
    expect(v).toContain(" a 3 faktury");
  });

  it("bez jména se neoslovuje", () => {
    expect(uvitani("", {}, rano)).toContain("Dobré ráno. ");
  });

  it("nuly se neuvádějí", () => {
    expect(uvitani("Ondra", { posta: 0, ukoly: 2 }, rano)).not.toContain("zpráv");
  });
});
