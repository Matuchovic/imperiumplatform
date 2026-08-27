import { describe, it, expect } from "vitest";
import { uroven, smiSpravovat, smiVstoupit, smiZapsatJizdu } from "@/lib/vozidla/pristup";

describe("úroveň přístupu", () => {
  it("vedení je ceo a vývojář", () => {
    expect(uroven("ceo")).toBe("vedeni");
    expect(uroven("vyvojar")).toBe("vedeni");
  });

  it("zbytek týmu je řidič", () => {
    for (const r of ["manazer", "marketing", "scout", "ucetni"]) {
      expect(uroven(r), r).toBe("ridic");
    }
  });

  it("klient a neznámá role nemají přístup", () => {
    expect(uroven("klient")).toBe("zadny");
    expect(uroven("nesmysl")).toBe("zadny");
    expect(uroven("")).toBe("zadny");
  });
});

describe("co kdo smí", () => {
  it("spravovat smí jen vedení", () => {
    expect(smiSpravovat("ceo")).toBe(true);
    expect(smiSpravovat("manazer")).toBe(false);
    expect(smiSpravovat("klient")).toBe(false);
  });

  it("vstoupit smí tým, ne klient", () => {
    expect(smiVstoupit("ucetni")).toBe(true);
    expect(smiVstoupit("klient")).toBe(false);
  });
});

describe("zápis jízdy", () => {
  const ja = "moje-id";
  const nekdo = "cizi-id";

  it("vedení smí u každého vozidla", () => {
    expect(smiZapsatJizdu("ceo", nekdo, ja)).toBe(true);
    expect(smiZapsatJizdu("ceo", null, ja)).toBe(true);
  });

  it("řidič jen u svého", () => {
    expect(smiZapsatJizdu("manazer", ja, ja)).toBe(true);
    expect(smiZapsatJizdu("manazer", nekdo, ja)).toBe(false);
    // Vozidlo bez řidiče se netýká nikoho z týmu.
    expect(smiZapsatJizdu("manazer", null, ja)).toBe(false);
  });

  it("klient nesmí nikdy", () => {
    expect(smiZapsatJizdu("klient", ja, ja)).toBe(false);
  });
});
