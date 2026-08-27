import { describe, it, expect } from "vitest";
import { iniciály, barvaZeJmena, BARVY, EFEKTY } from "@/lib/avatar";

describe("iniciály", () => {
  it("dvě slova dají první a poslední písmeno", () => {
    expect(iniciály("Jan Novák")).toBe("JN");
    expect(iniciály("Ondřej Matucha")).toBe("OM");
  });

  it("tři slova berou krajní, ne první dvě", () => {
    expect(iniciály("Jan Karel Novák")).toBe("JN");
  });

  it("jedno slovo dá první dvě písmena", () => {
    expect(iniciály("matuchovic")).toBe("MA");
  });

  it("prázdné a nesmysl dají otazník", () => {
    expect(iniciály("")).toBe("?");
    expect(iniciály(null)).toBe("?");
    expect(iniciály("   ")).toBe("?");
    expect(iniciály("123")).toBe("?");
  });

  it("diakritika projde", () => {
    expect(iniciály("Šimon Čermák")).toBe("ŠČ");
  });

  it("znaky z názvů firem se ignorují", () => {
    // „Kadeřnictví Gabriela s.r.o." nesmí dát KS podle tečky.
    expect(iniciály("Kadeřnictví Gabriela s.r.o.")).toBe("KO");
    expect(iniciály('"ÖKO - PROFIS" s.r.o.')).toBe("ÖO");
  });
});

describe("barva ze jména", () => {
  it("stejné jméno vždy stejná barva", () => {
    expect(barvaZeJmena("Jan Novák")).toBe(barvaZeJmena("Jan Novák"));
  });

  it("různá jména dávají rozdílné barvy napříč paletou", () => {
    const jmena = ["Jan Novák", "Petr Svoboda", "Marie Kučerová", "Eva Nováková",
                   "Radek Beneš", "Lucie Horká", "Martin Kříž", "Jan Bureš"];
    const barvy = new Set(jmena.map((j) => barvaZeJmena(j).pozadi));
    // U osmi jmen chci aspoň čtyři různé barvy, jinak by seznam splýval.
    expect(barvy.size).toBeGreaterThanOrEqual(4);
  });

  it("paleta neobsahuje stavové barvy", () => {
    // Jantarová a červená v systému znamenají „pozor" a „chyba".
    for (const b of BARVY) {
      const [r, g, bl] = [1, 3, 5].map((i) => parseInt(b.pozadi.slice(i, i + 2), 16));
      expect(r < 140, `${b.pozadi} je moc červená`).toBe(true);
      expect(r > g && r > bl, `${b.pozadi} je teplá`).toBe(false);
    }
  });
});

describe("efekty", () => {
  it("klíče jsou jedinečné", () => {
    const k = EFEKTY.map((e) => e.klic);
    expect(new Set(k).size).toBe(k.length);
  });

  it("žádný efekt je první volba", () => {
    expect(EFEKTY[0].klic).toBe("zadny");
  });
});
