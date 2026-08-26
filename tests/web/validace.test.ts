import { describe, it, expect } from "vitest";
import { overUrl, domena, kvalitaZdroje, googleUrl } from "@/lib/ai/tools/web/validace";

describe("povolené protokoly", () => {
  it("https projde", () => {
    expect(overUrl("https://example.com/a").ok).toBe(true);
  });

  it("http projde", () => {
    expect(overUrl("http://example.com").ok).toBe(true);
  });

  it("nebezpečné protokoly neprojdou", () => {
    // Tyhle by umožnily číst soubory nebo spustit kód.
    for (const u of [
      "file:///etc/passwd",
      "ftp://example.com",
      "javascript:alert(1)",
      "data:text/html,<script>",
      "gopher://example.com",
    ]) {
      const v = overUrl(u);
      expect(v.ok, u).toBe(false);
    }
  });

  it("nesmysl neprojde", () => {
    expect(overUrl("není adresa").ok).toBe(false);
    expect(overUrl("").ok).toBe(false);
  });
});

describe("ochrana vnitřní sítě", () => {
  it("smyčka neprojde", () => {
    for (const u of ["http://localhost/x", "http://127.0.0.1/", "http://[::1]/", "http://0.0.0.0/"]) {
      expect(overUrl(u).ok, u).toBe(false);
    }
  });

  it("privátní rozsahy neprojdou", () => {
    for (const u of [
      "http://10.0.0.5/",
      "http://192.168.1.1/",
      "http://172.16.0.1/",
      "http://172.31.255.254/",
    ]) {
      expect(overUrl(u).ok, u).toBe(false);
    }
  });

  it("metadata cloudu neprojdou", () => {
    // 169.254.169.254 vrací přístupové údaje k infrastruktuře.
    expect(overUrl("http://169.254.169.254/latest/meta-data/").ok).toBe(false);
    expect(overUrl("http://metadata.google.internal/").ok).toBe(false);
  });

  it("vnitřní domény neprojdou", () => {
    for (const u of ["http://server.local/", "http://api.internal/", "http://intranet/"]) {
      expect(overUrl(u).ok, u).toBe(false);
    }
  });

  it("IPv6 vnitřní rozsahy neprojdou", () => {
    for (const u of ["http://[fe80::1]/", "http://[fd00::1]/"]) {
      expect(overUrl(u).ok, u).toBe(false);
    }
  });

  it("běžná veřejná adresa projde", () => {
    expect(overUrl("https://ares.gov.cz/x").ok).toBe(true);
    expect(overUrl("https://8.8.8.8/").ok).toBe(true);
  });
});

describe("doména", () => {
  it("odstraní www", () => {
    expect(domena("https://www.idnes.cz/clanek")).toBe("idnes.cz");
  });

  it("z nesmyslu vrátí prázdno", () => {
    expect(domena("nic")).toBe("");
  });
});

describe("kvalita zdroje", () => {
  it("státní zdroje jsou oficiální", () => {
    expect(kvalitaZdroje("https://ares.gov.cz/x")).toBe("oficialni");
    expect(kvalitaZdroje("https://isir.justice.cz/x")).toBe("oficialni");
  });

  it("známá média jsou důvěryhodná", () => {
    expect(kvalitaZdroje("https://cs.wikipedia.org/wiki/X")).toBe("duveryhodny");
    expect(kvalitaZdroje("https://www.idnes.cz/x")).toBe("duveryhodny");
  });

  it("neznámý web je sekundární", () => {
    expect(kvalitaZdroje("https://nejaky-blog.cz/x")).toBe("sekundarni");
  });

  it("nesmysl je neznámý", () => {
    expect(kvalitaZdroje("nic")).toBe("neznamy");
  });
});

describe("adresa vyhledávání", () => {
  it("dotaz se kóduje", () => {
    expect(googleUrl("Real Madrid Arsenal")).toBe(
      "https://www.google.com/search?q=Real%20Madrid%20Arsenal"
    );
  });

  it("znaky s významem v URL se ošetří", () => {
    const u = googleUrl("a&b=c?d#e");
    expect(u).not.toContain("&b=");
    expect(u).toContain("%26");
  });

  it("diakritika projde", () => {
    expect(googleUrl("zranění hráče")).toContain("%C4%9B");
  });
});
