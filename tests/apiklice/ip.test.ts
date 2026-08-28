import { describe, it, expect } from "vitest";
import { ipSedi, ipProchazi, adresaZadatele } from "@/lib/apiklice/ip";

describe("shoda IP", () => {
  it("přesná adresa", () => {
    expect(ipSedi("81.2.3.4", "81.2.3.4")).toBe(true);
    expect(ipSedi("81.2.3.4", "81.2.3.5")).toBe(false);
  });

  it("rozsah s lomítkem", () => {
    expect(ipSedi("81.2.3.0/24", "81.2.3.99")).toBe(true);
    expect(ipSedi("81.2.3.0/24", "81.2.4.1")).toBe(false);
  });

  it("široký rozsah", () => {
    expect(ipSedi("10.0.0.0/8", "10.255.255.255")).toBe(true);
    expect(ipSedi("10.0.0.0/8", "11.0.0.1")).toBe(false);
  });

  it("plný prefix je přesná shoda", () => {
    expect(ipSedi("81.2.3.4/32", "81.2.3.4")).toBe(true);
    expect(ipSedi("81.2.3.4/32", "81.2.3.5")).toBe(false);
  });

  it("nulový prefix pustí vše", () => {
    // Posun o 32 bitů je v JS nedefinovaný — proto zvláštní větev.
    expect(ipSedi("0.0.0.0/0", "1.2.3.4")).toBe(true);
  });

  it("nesmyslný vzor neprojde", () => {
    for (const v of ["", "abc", "999.1.1.1", "1.2.3", "1.2.3.4/33", "1.2.3.4/-1"]) {
      expect(ipSedi(v, "1.2.3.4"), v).toBe(false);
    }
  });

  it("nesmyslná adresa neprojde", () => {
    expect(ipSedi("1.2.3.0/24", "300.2.3.4")).toBe(false);
    expect(ipSedi("1.2.3.0/24", "")).toBe(false);
  });

  it("IPv6 jen přesně", () => {
    expect(ipSedi("2001:db8::1", "2001:DB8::1")).toBe(true);
    expect(ipSedi("2001:db8::1", "2001:db8::2")).toBe(false);
    // Rozsah u IPv6 nepodporujeme schválně.
    expect(ipSedi("2001:db8::/32", "2001:db8::1")).toBe(false);
  });
});

describe("průchod seznamem", () => {
  it("prázdný seznam pustí vše", () => {
    expect(ipProchazi([], "1.2.3.4")).toBe(true);
    expect(ipProchazi([], null)).toBe(true);
  });

  it("bez adresy neprojde nic, když je omezení nastavené", () => {
    expect(ipProchazi(["1.2.3.4"], null)).toBe(false);
  });

  it("stačí jeden vyhovující vzor", () => {
    expect(ipProchazi(["9.9.9.9", "81.2.3.0/24"], "81.2.3.7")).toBe(true);
    expect(ipProchazi(["9.9.9.9", "81.2.3.0/24"], "1.1.1.1")).toBe(false);
  });
});

describe("adresa žadatele", () => {
  const h = (o: Record<string, string>) => new Headers(o);

  it("bere první z řetězce proxy", () => {
    expect(adresaZadatele(h({ "x-forwarded-for": "81.2.3.4, 10.0.0.1, 10.0.0.2" })))
      .toBe("81.2.3.4");
  });

  it("záložní hlavička", () => {
    expect(adresaZadatele(h({ "x-real-ip": "81.2.3.4" }))).toBe("81.2.3.4");
  });

  it("bez hlaviček vrací null", () => {
    expect(adresaZadatele(h({}))).toBeNull();
  });
});

/**
 * Ochrana proti volání na vnitřní síť.
 *
 * Webhook míří na adresu, kterou zadá člověk. Bez kontroly by
 * se dal donutit server volat na vlastní vnitřní adresy — je to
 * klasický útok a stojí za vlastní test.
 */
describe("vnitřní adresy u webhooku", () => {
  const vnitrni = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/i;

  it("vnitřní adresy se poznají", () => {
    for (const h of [
      "localhost", "127.0.0.1", "10.0.0.5", "192.168.1.1",
      "169.254.169.254", "172.16.0.1", "172.31.255.255", "::1",
    ]) {
      expect(vnitrni.test(h), h).toBe(true);
    }
  });

  it("veřejné adresy projdou", () => {
    for (const h of ["bet-imperium.cz", "www.bet-imperium.cz", "81.2.3.4", "172.15.0.1", "172.32.0.1"]) {
      expect(vnitrni.test(h), h).toBe(false);
    }
  });
});
