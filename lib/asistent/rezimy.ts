/**
 * Režimy asistenta — čistá data, žádné závislosti.
 *
 * Odděleno od `nastroje.ts` schválně: ten sahá na databázi a je tedy
 * serverový. Klientský panel potřebuje jen názvy a ikony, a kdyby si
 * je bral odtamtud, stáhl by si do prohlížeče celý přístup k Supabase.
 * Build na to spadl.
 */

export type Rezim = "ask" | "search" | "build" | "operate";

export const REZIMY: { klic: Rezim; nazev: string; popis: string; ikona: string }[] = [
  { klic: "ask", nazev: "Ask", popis: "Odpovídá z dat. Nic nemění.", ikona: "message-circle" },
  { klic: "search", nazev: "Search", popis: "Hledá v systému i na webu.", ikona: "search" },
  { klic: "build", nazev: "Build", popis: "Zakládá úkoly, poznámky, koncepty.", ikona: "pencil-plus" },
  { klic: "operate", nazev: "Operate", popis: "Ovládá systém. Rizikové akce čekají na tebe.", ikona: "settings-bolt" },
];

export const jeRezim = (v: unknown): v is Rezim =>
  REZIMY.some((r) => r.klic === v);
