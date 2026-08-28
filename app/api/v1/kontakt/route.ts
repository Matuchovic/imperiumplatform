import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { overKlic, zapisVolani } from "@/lib/apiklice/overeni";

export const dynamic = "force-dynamic";

/**
 * Formulář na webu zakládá kontakt.
 *
 * Souhlas se ukládá se zdrojem a časem — bez toho se při kontrole
 * nedá doložit, odkud se vzal, a rozesílka je pak protiprávní.
 */
export async function POST(req: Request) {
  const zacatek = Date.now();
  const o = await overKlic(req, "kontakty:zapis");

  if (!o.ok) {
    await zapisVolani({
      klicId: null, cesta: "/api/v1/kontakt", metoda: "POST",
      stav: o.stav, req, trvani: Date.now() - zacatek, chyba: o.duvod,
    });
    return NextResponse.json({ chyba: o.duvod }, { status: o.stav });
  }

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch {
    await zapisVolani({ klicId: o.id, cesta: "/api/v1/kontakt", metoda: "POST",
      stav: 400, req, trvani: Date.now() - zacatek, chyba: "neplatný JSON" });
    return NextResponse.json({ chyba: "Neplatný požadavek." }, { status: 400 });
  }

  const email = String(b.email ?? "").trim().toLowerCase();
  const jmeno = String(b.jmeno ?? "").trim().slice(0, 120);

  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(email)) {
    await zapisVolani({ klicId: o.id, cesta: "/api/v1/kontakt", metoda: "POST",
      stav: 422, req, trvani: Date.now() - zacatek, chyba: "neplatný e-mail" });
    return NextResponse.json({ chyba: "Neplatný e-mail." }, { status: 422 });
  }

  const db = serviceClient();
  const { error } = await db.from("kontakty").insert({
    company_name: jmeno || email,
    email,
    phone: String(b.telefon ?? "").trim().slice(0, 40) || null,
    /**
     * Účel rozhoduje, jestli se na kontakt smí psát.
     *
     * Bez výslovného souhlasu je to jen obchodní kontakt —
     * oslovit se smí až po zaškrtnutí na webu.
     */
    ucel: b.souhlas === true ? "osloveni_povoleno" : "obchodni_kontakt",
    zdroj: "web bet-imperium.cz",
    poznamka: String(b.poznamka ?? "").trim().slice(0, 500) || null,
  });

  const stav = error ? 500 : 201;
  await zapisVolani({
    klicId: o.id, cesta: "/api/v1/kontakt", metoda: "POST",
    stav, req, trvani: Date.now() - zacatek, chyba: error?.message,
  });

  // Chybu databáze ven neposíláme — prozrazuje strukturu tabulek.
  if (error) return NextResponse.json({ chyba: "Uložení selhalo." }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
