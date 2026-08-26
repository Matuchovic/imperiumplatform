import { describe, it, expect } from "vitest";
import {
  rozpoznejZarizeni, zkratIp, otiskZarizeni, trvani, ipZHlavicek,
} from "@/lib/bezpecnost/otisk";

const UA = {
  safariMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  chromeWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  edgeWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
};

describe("rozpoznání zařízení", () => {
  it("pozná druh", () => {
    expect(rozpoznejZarizeni(UA.safariMac).druh).toBe("pocitac");
    expect(rozpoznejZarizeni(UA.iphone).druh).toBe("mobil");
    expect(rozpoznejZarizeni(UA.ipad).druh).toBe("tablet");
  });

  it("pozná systém", () => {
    expect(rozpoznejZarizeni(UA.safariMac).system).toBe("macOS");
    expect(rozpoznejZarizeni(UA.chromeWin).system).toBe("Windows");
    expect(rozpoznejZarizeni(UA.iphone).system).toBe("iOS");
    expect(rozpoznejZarizeni(UA.android).system).toBe("Android");
  });

  it("Edge se nezamění za Chrome", () => {
    // Edge se hlásí jako Chrome i Safari — rozhoduje pořadí kontrol.
    expect(rozpoznejZarizeni(UA.edgeWin).prohlizec).toBe("Edge");
    expect(rozpoznejZarizeni(UA.chromeWin).prohlizec).toBe("Chrome");
    expect(rozpoznejZarizeni(UA.safariMac).prohlizec).toBe("Safari");
  });

  it("nainstalovanou aplikaci pozná podle chybějícího odkazovače", () => {
    expect(rozpoznejZarizeni(UA.iphone, "none").pwa).toBe(true);
    expect(rozpoznejZarizeni(UA.iphone, "same-origin").pwa).toBe(false);
  });

  it("prázdný řetězec nespadne", () => {
    const z = rozpoznejZarizeni("");
    expect(z.druh).toBe("nezname");
    expect(z.system).toBe("neznámý");
  });
});

describe("zkrácení adresy", () => {
  it("IPv4 nechá dva oktety", () => {
    expect(zkratIp("85.71.132.44")).toBe("85.71.•••.•••");
  });

  it("IPv6 nechá dva bloky", () => {
    expect(zkratIp("2001:db8::1")).toBe("2001:db8:•••");
  });

  it("chybějící adresa nespadne", () => {
    expect(zkratIp(null)).toBe("neznámá");
    expect(zkratIp("nesmysl")).toBe("neznámá");
  });
});

describe("adresa z hlaviček", () => {
  it("bere první z forwarded-for", () => {
    // Za proxy je adres víc, klientská je první.
    const h = new Headers({ "x-forwarded-for": "85.71.1.1, 10.0.0.1, 172.16.0.1" });
    expect(ipZHlavicek(h)).toBe("85.71.1.1");
  });

  it("spadne na real-ip", () => {
    expect(ipZHlavicek(new Headers({ "x-real-ip": "1.2.3.4" }))).toBe("1.2.3.4");
  });

  it("bez hlaviček vrátí null", () => {
    expect(ipZHlavicek(new Headers())).toBeNull();
  });
});

describe("otisk zařízení", () => {
  it("stejné zařízení dá stejný otisk", () => {
    expect(otiskZarizeni(UA.safariMac, "cs")).toBe(otiskZarizeni(UA.safariMac, "cs"));
  });

  it("jiné zařízení dá jiný otisk", () => {
    expect(otiskZarizeni(UA.safariMac, "cs")).not.toBe(otiskZarizeni(UA.iphone, "cs"));
  });

  it("jiný jazyk dá jiný otisk", () => {
    expect(otiskZarizeni(UA.safariMac, "cs")).not.toBe(otiskZarizeni(UA.safariMac, "en"));
  });
});

describe("trvání relace", () => {
  const ted = new Date("2026-08-26T20:00:00Z");
  const pred = (min: number) => new Date(ted.getTime() - min * 60000).toISOString();

  it("pod minutu hlásí právě teď", () => {
    expect(trvani(pred(0), ted.toISOString())).toBe("právě teď");
  });

  it("minuty", () => {
    expect(trvani(pred(38), ted.toISOString())).toBe("38 min");
  });

  it("hodiny s minutami", () => {
    expect(trvani(pred(134), ted.toISOString())).toBe("2 h 14 min");
  });

  it("celé hodiny bez zbytku", () => {
    expect(trvani(pred(120), ted.toISOString())).toBe("2 h");
  });
});
