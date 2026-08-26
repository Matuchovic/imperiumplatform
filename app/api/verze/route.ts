import { NextResponse } from "next/server";
import { VERZE, VERZE_POPIS, VERZE_DULEZITA, BUILD_ID } from "@/lib/verze";

/**
 * Verze, která je právě nasazená na serveru.
 *
 * Klient ji porovnává s tou, se kterou se sám načetl. Odpověď nesmí
 * nikdy spadnout do mezipaměti — jinak by aplikace dostávala staré
 * číslo a lišta by nenaskočila.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return new NextResponse(
    JSON.stringify({ verze: VERZE, popis: VERZE_POPIS, dulezita: VERZE_DULEZITA, build: BUILD_ID }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    }
  );
}
