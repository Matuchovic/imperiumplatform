import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { overKlic, zapisVolani } from "@/lib/apiklice/overeni";

export const dynamic = "force-dynamic";

/** Kontaktní formulář zakládá dotaz v podpoře. */
export async function POST(req: Request) {
  const zacatek = Date.now();
  const o = await overKlic(req, "podpora:zapis");

  if (!o.ok) {
    await zapisVolani({ klicId: null, cesta: "/api/v1/dotaz", metoda: "POST",
      stav: o.stav, req, trvani: Date.now() - zacatek, chyba: o.duvod });
    return NextResponse.json({ chyba: o.duvod }, { status: o.stav });
  }

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ chyba: "Neplatný požadavek." }, { status: 400 }); }

  const email = String(b.email ?? "").trim().toLowerCase();
  const text = String(b.text ?? "").trim().slice(0, 4000);

  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(email) || text.length < 5) {
    await zapisVolani({ klicId: o.id, cesta: "/api/v1/dotaz", metoda: "POST",
      stav: 422, req, trvani: Date.now() - zacatek, chyba: "neúplný dotaz" });
    return NextResponse.json({ chyba: "Chybí e-mail nebo text." }, { status: 422 });
  }

  const db = serviceClient();
  const { error } = await db.from("tikety_podpory").insert({
    predmet: String(b.predmet ?? "").trim().slice(0, 200) || "Dotaz z webu",
    zprava: text,
    // E-mail patří do vlastního pole, ne slepený do textu —
    // jinak se na dotaz nedá odpovědět jedním klepnutím.
    od_koho: email,
    kanal: "email",
    stav: "novy",
    priorita: "bezna",
  });

  const stav = error ? 500 : 201;
  await zapisVolani({ klicId: o.id, cesta: "/api/v1/dotaz", metoda: "POST",
    stav, req, trvani: Date.now() - zacatek, chyba: error?.message });

  if (error) return NextResponse.json({ chyba: "Uložení selhalo." }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
