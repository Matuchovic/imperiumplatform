import { describe, it, expect } from "vitest";
import { naIban, rozlozUcet, platnyUcet, formatujIban } from "@/lib/faktury/iban";
import { spd, ocistiZpravu } from "@/lib/faktury/spd";
import { soucty, zaklad, dan, dalsiCislo, splatnostZa, prazdnaPolozka } from "@/lib/faktury/polozky";
import { poSplatnosti, doSplatnosti, prumernaDobaPlaceni, souhrn, vsZCisla } from "@/lib/faktury/stav";
import { predmet, telo, mailto } from "@/lib/faktury/upominky";

describe("rozklad čísla účtu", () => {
  it("s předčíslím i bez", () => {
    expect(rozlozUcet("123456789/0800")).toEqual({ predcisli: "", cislo: "123456789", banka: "0800" });
    expect(rozlozUcet("19-123456789/0800")).toEqual({ predcisli: "19", cislo: "123456789", banka: "0800" });
  });

  it("mezery nevadí", () => {
    expect(rozlozUcet("123456789 / 0800")?.banka).toBe("0800");
  });

  it("nesmysl vrátí null", () => {
    for (const u of ["", "abc", "123456789", "123/12", "123456789/08000"]) {
      expect(rozlozUcet(u), u).toBeNull();
    }
  });
});

describe("kontrola účtu", () => {
  it("platné číslo projde", () => {
    // 19-2000145399 je veřejné číslo účtu ČNB, kontrolní součet sedí.
    expect(platnyUcet("2000145399")).toBe(true);
  });

  it("překlep se pozná", () => {
    expect(platnyUcet("2000145398")).toBe(false);
  });
});

describe("IBAN", () => {
  it("má správnou délku a začíná CZ", () => {
    const i = naIban("19-2000145399/0710")!;
    expect(i).toHaveLength(24);
    expect(i.startsWith("CZ")).toBe(true);
  });

  it("kontrolní číslice sedí — mod 97 dá jedničku", () => {
    const i = naIban("123456789/0800")!;
    const prehozeny = i.slice(4) + "1235" + i.slice(2, 4);
    let z = 0;
    for (const c of prehozeny) z = (z * 10 + Number(c)) % 97;
    expect(z).toBe(1);
  });

  it("neplatný účet nedá IBAN", () => {
    expect(naIban("nesmysl")).toBeNull();
  });

  it("formátování po čtveřicích", () => {
    expect(formatujIban("CZ6508000000192000145399")).toBe("CZ65 0800 0000 1920 0014 5399");
  });
});

describe("QR platba SPD", () => {
  it("obsahuje povinná pole", () => {
    const s = spd({ ucet: "123456789/0800", castka: 12100, vs: "2026001" })!;
    expect(s.startsWith("SPD*1.0*")).toBe(true);
    expect(s).toContain("ACC:CZ");
    expect(s).toContain("AM:12100.00");
    expect(s).toContain("CC:CZK");
    expect(s).toContain("X-VS:2026001");
  });

  it("částka má vždy dvě desetinná místa", () => {
    expect(spd({ ucet: "123456789/0800", castka: 100 })).toContain("AM:100.00");
    expect(spd({ ucet: "123456789/0800", castka: 99.5 })).toContain("AM:99.50");
  });

  it("splatnost je bez pomlček", () => {
    const s = spd({ ucet: "123456789/0800", castka: 100, splatnost: "2026-09-15" })!;
    expect(s).toContain("DT:20260915");
  });

  it("neplatný účet nedá řetězec", () => {
    expect(spd({ ucet: "xxx", castka: 100 })).toBeNull();
  });
});

describe("očištění zprávy", () => {
  it("hvězdička je oddělovač, musí pryč", () => {
    expect(ocistiZpravu("Platba*za*sluzby")).toBe("Platba za sluzby");
  });

  it("diakritika se odstraní", () => {
    expect(ocistiZpravu("Příliš žluťoučký")).toBe("Prilis zlutoucky");
  });

  it("délka se ořízne", () => {
    expect(ocistiZpravu("a".repeat(100)).length).toBeLessThanOrEqual(60);
  });
});

describe("položky a součty", () => {
  const p = (cena: number, mnozstvi = 1, dph = 21) => ({
    ...prazdnaPolozka(), nazev: "x", cena, mnozstvi, dph,
  });

  it("základ a daň položky", () => {
    expect(zaklad(p(1000, 3))).toBe(3000);
    expect(dan(p(1000, 3))).toBe(630);
  });

  it("neplátce nemá DPH", () => {
    const s = soucty([p(1000), p(2000)], false);
    expect(s.bezDph).toBe(3000);
    expect(s.dph).toBe(0);
    expect(s.celkem).toBe(3000);
  });

  it("plátce má daň po sazbách zvlášť", () => {
    const s = soucty([p(1000, 1, 21), p(1000, 1, 12)], true);
    expect(s.bezDph).toBe(2000);
    expect(s.dph).toBe(330);
    expect(s.celkem).toBe(2330);
    expect(s.podleSazeb).toEqual([
      { sazba: 12, zaklad: 1000, dan: 120 },
      { sazba: 21, zaklad: 1000, dan: 210 },
    ]);
  });

  it("nulová sazba je platná sazba, ne chybějící", () => {
    const s = soucty([p(1000, 1, 0)], true);
    expect(s.dph).toBe(0);
    expect(s.podleSazeb).toHaveLength(1);
  });

  it("prázdná faktura je nula", () => {
    expect(soucty([], true).celkem).toBe(0);
  });
});

describe("číslo faktury", () => {
  it("první v roce", () => {
    expect(dalsiCislo(2026, null)).toBe("2026001");
    expect(dalsiCislo(2026, "2025047")).toBe("2026001");
  });

  it("pokračuje v řadě", () => {
    expect(dalsiCislo(2026, "2026001")).toBe("2026002");
    expect(dalsiCislo(2026, "2026099")).toBe("2026100");
  });
});

describe("splatnost", () => {
  it("přičte dny", () => {
    expect(splatnostZa("2026-08-27", 14)).toBe("2026-09-10");
  });

  it("přes konec roku", () => {
    expect(splatnostZa("2026-12-25", 14)).toBe("2027-01-08");
  });
});

describe("stav faktury", () => {
  const f = (o: Partial<Parameters<typeof poSplatnosti>[0]> = {}) => ({
    stav: "vystavena", castka: 10000, vystaveno: "2026-08-01",
    splatnost: "2026-08-15", zaplaceno_at: null, ...o,
  });
  const dnes = new Date(2026, 7, 27);

  it("po splatnosti se počítá jen u vystavených", () => {
    expect(poSplatnosti(f(), dnes)).toBe(12);
    expect(poSplatnosti(f({ stav: "zaplacena" }), dnes)).toBe(0);
    expect(poSplatnosti(f({ stav: "koncept" }), dnes)).toBe(0);
  });

  it("před splatností je nula, ne záporné číslo", () => {
    expect(poSplatnosti(f({ splatnost: "2026-09-30" }), dnes)).toBe(0);
  });

  it("do splatnosti umí i záporné", () => {
    expect(doSplatnosti(f({ splatnost: "2026-09-06" }), dnes)).toBe(10);
    expect(doSplatnosti(f(), dnes)).toBe(-12);
  });

  it("průměrná doba placení jen z uhrazených", () => {
    const p = prumernaDobaPlaceni([
      f({ stav: "zaplacena", vystaveno: "2026-08-01", zaplaceno_at: "2026-08-11" }),
      f({ stav: "zaplacena", vystaveno: "2026-08-01", zaplaceno_at: "2026-08-21" }),
      f(),
    ]);
    expect(p).toBe(15);
  });

  it("bez uhrazených se průměr nedá spočítat", () => {
    expect(prumernaDobaPlaceni([f()])).toBeNull();
  });

  it("souhrn rozdělí částky podle stavu", () => {
    const s = souhrn([
      f({ stav: "zaplacena", castka: 5000 }),
      f({ castka: 10000 }),
      f({ castka: 3000, splatnost: "2026-09-30" }),
    ], dnes);
    expect(s.zaplaceno).toBe(5000);
    expect(s.ceka).toBe(13000);
    expect(s.poSplatnosti).toBe(10000);
    expect(s.pocetPoSplatnosti).toBe(1);
  });
});

describe("variabilní symbol", () => {
  it("z čísla faktury jen číslice", () => {
    expect(vsZCisla("2026001")).toBe("2026001");
    expect(vsZCisla("FA-2026/001")).toBe("2026001");
  });

  it("nejvýš deset číslic", () => {
    expect(vsZCisla("123456789012345").length).toBe(10);
  });
});

describe("upomínky", () => {
  const p = {
    cislo: "2026001", odberatel: "Firma s.r.o.", castka: "12 100 Kč",
    splatnost: "15. 8. 2026", dni: 12, firma: "BETIMPERIUM s.r.o.",
    ucet: "123456789/0800", vs: "2026001",
  };

  it("každá úroveň má vlastní předmět", () => {
    const p1 = predmet("prvni", p);
    const p2 = predmet("druha", p);
    const p3 = predmet("predzalobni", p);
    expect(new Set([p1, p2, p3]).size).toBe(3);
    expect(p3).toContain("Předžalobní");
  });

  it("první upomínka připouští, že platba mohla proběhnout", () => {
    expect(telo("prvni", p)).toContain("bezpředmětnou");
  });

  it("předžalobní cituje paragraf", () => {
    expect(telo("predzalobni", p)).toContain("§ 142a");
  });

  it("číslo účtu se objeví, když je zadané", () => {
    expect(telo("prvni", p)).toContain("123456789/0800");
    expect(telo("prvni", { ...p, ucet: undefined })).not.toContain("uhraďte na účet");
  });

  it("mailto má zakódovaný předmět i tělo", () => {
    const m = mailto("a@b.cz", "prvni", p);
    expect(m.startsWith("mailto:a%40b.cz?subject=")).toBe(true);
    expect(m).toContain("&body=");
  });
});
