import { describe, it, expect, beforeAll } from "vitest";
import { zasifruj, desifruj, trezorPripraven, naznak } from "@/lib/trezor/sifra";

beforeAll(() => {
  process.env.TREZOR_KLIC = "testovaci-klic-dost-dlouhy-aby-prosel-1234";
});

describe("šifrování trezoru", () => {
  it("text projde tam i zpět", () => {
    const t = "Sp3ciální!Heslo #42";
    const s = zasifruj(t)!;
    expect(s).not.toContain(t);
    expect(desifruj(s)).toBe(t);
  });

  it("diakritika a emoji přežijí", () => {
    for (const t of ["příliš žluťoučký kůň", "🔐 klíč", "řádek\ndruhý"]) {
      expect(desifruj(zasifruj(t)!)).toBe(t);
    }
  });

  it("stejný text pokaždé jinak", () => {
    // Bez náhodného IV by šlo z opakujících se šifer vyčíst,
    // že dva záznamy mají stejné heslo.
    const a = zasifruj("heslo");
    const b = zasifruj("heslo");
    expect(a).not.toBe(b);
    expect(desifruj(a!)).toBe(desifruj(b!));
  });

  it("pozměněný záznam se nedešifruje", () => {
    const s = zasifruj("tajné")!;
    const [iv, tag, data] = s.split(":");
    // Změna jediného znaku v datech musí být odhalena.
    const zmenene = data[0] === "A" ? "B" + data.slice(1) : "A" + data.slice(1);
    expect(desifruj([iv, tag, zmenene].join(":"))).toBeNull();
  });

  it("nesmysl vrátí null místo výjimky", () => {
    for (const s of ["", "abc", "a:b", "a:b:c:d"]) {
      expect(desifruj(s)).toBeNull();
    }
  });

  it("bez klíče se nešifruje ani nedešifruje", () => {
    const puvodni = process.env.TREZOR_KLIC;
    process.env.TREZOR_KLIC = "";
    expect(trezorPripraven()).toBe(false);
    expect(zasifruj("x")).toBeNull();
    expect(desifruj("a:b:c")).toBeNull();
    process.env.TREZOR_KLIC = puvodni;
  });

  it("krátký klíč se odmítne", () => {
    const puvodni = process.env.TREZOR_KLIC;
    process.env.TREZOR_KLIC = "kratky";
    expect(trezorPripraven()).toBe(false);
    process.env.TREZOR_KLIC = puvodni;
  });
});

describe("náznak", () => {
  it("nikdy neprozradí obsah", () => {
    expect(naznak(8)).toBe("••••••••");
    expect(naznak(2)).toHaveLength(6);
    expect(naznak(90)).toHaveLength(12);
  });
});
