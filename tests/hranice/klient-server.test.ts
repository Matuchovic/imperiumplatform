import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Hranice mezi prohlížečem a serverem.
 *
 * Klientská komponenta nesmí — ani nepřímo přes několik importů —
 * sáhnout na modul, který používá node:crypto, next/headers nebo
 * přístup k databázi. Webpack takový strom vtáhne do prohlížeče
 * a build spadne.
 *
 * Tenhle test padl třikrát v produkci, než vznikl: u režimů
 * asistenta, u konstant zámku a u přístupu k Supabase.
 */

const KOREN = resolve(__dirname, "../..");
const ZAKAZANE = /from "node:|require\("node:|next\/headers|@\/lib\/supabase\/server/;

function serverovyPuvod(modul: string, hloubka = 0): string | null {
  if (hloubka > 5) return null;

  for (const p of [`${modul}.ts`, `${modul}.tsx`, `${modul}/index.ts`]) {
    const cesta = resolve(KOREN, p);
    if (!existsSync(cesta)) continue;

    const obsah = readFileSync(cesta, "utf8");
    if (ZAKAZANE.test(obsah)) return p;

    for (const m of obsah.matchAll(/from "(@\/[^"]+)"/g)) {
      const dal = serverovyPuvod(m[1].replace("@/", ""), hloubka + 1);
      if (dal) return dal;
    }
  }
  return null;
}

describe("hranice klient / server", () => {
  const klientske = execSync(
    'grep -rl "use client" components app --include=*.tsx || true',
    { cwd: KOREN, encoding: "utf8" }
  ).trim().split("\n").filter(Boolean);

  it("nějaké klientské komponenty existují", () => {
    expect(klientske.length).toBeGreaterThan(5);
  });

  it.each(klientske)("%s netáhne serverový kód", (soubor) => {
    const obsah = readFileSync(resolve(KOREN, soubor), "utf8");
    const problemy: string[] = [];

    for (const m of obsah.matchAll(/from "(@\/(?:lib|components)\/[^"]+)"/g)) {
      const zdroj = serverovyPuvod(m[1].replace("@/", ""));
      if (zdroj) problemy.push(`${m[1]} → ${zdroj}`);
    }

    expect(problemy, `${soubor} táhne server přes: ${problemy.join(", ")}`).toEqual([]);
  });
});
