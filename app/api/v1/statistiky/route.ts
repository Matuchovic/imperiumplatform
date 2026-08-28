import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { overKlic, zapisVolani } from "@/lib/apiklice/overeni";

export const dynamic = "force-dynamic";

/**
 * Veřejná čísla pro web.
 *
 * Zaokrouhlená a bez rozpadu na jednotlivce — z přesných čísel
 * by šlo dopočítat, kolik má konkrétní klient na účtu.
 */
export async function GET(req: Request) {
  const zacatek = Date.now();
  const o = await overKlic(req, "statistiky:cteni");

  if (!o.ok) {
    await zapisVolani({ klicId: null, cesta: "/api/v1/statistiky", metoda: "GET",
      stav: o.stav, req, trvani: Date.now() - zacatek, chyba: o.duvod });
    return NextResponse.json({ chyba: o.duvod }, { status: o.stav });
  }

  const db = serviceClient();
  const [klienti, tikety] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "klient"),
    db.from("tickets").select("profit, stake, clv").neq("state", "open").limit(5000),
  ]);

  const t = (tikety.data ?? []) as { profit: number; stake: number; clv: number | null }[];
  const vklad = t.reduce((a, x) => a + Number(x.stake), 0);
  const zisk = t.reduce((a, x) => a + Number(x.profit), 0);
  const sClv = t.filter((x) => x.clv !== null);

  /**
   * Malý vzorek se neposílá.
   *
   * Pod dvě stě tiketů je ROI náhoda a zveřejnit ji na webu
   * by bylo zavádějící tvrzení.
   */
  const dostVzorku = t.length >= 200;

  const data = {
    klientu: klienti.count ?? 0,
    tiketu: t.length,
    roi: dostVzorku && vklad > 0 ? Math.round((zisk / vklad) * 1000) / 10 : null,
    clv: sClv.length >= 100
      ? Math.round((sClv.reduce((a, x) => a + Number(x.clv), 0) / sClv.length) * 100) / 100
      : null,
    poznamka: dostVzorku
      ? null
      : "Vzorek je zatím malý, výkonnostní čísla neuvádíme.",
  };

  await zapisVolani({ klicId: o.id, cesta: "/api/v1/statistiky", metoda: "GET",
    stav: 200, req, trvani: Date.now() - zacatek });

  return NextResponse.json(data);
}
