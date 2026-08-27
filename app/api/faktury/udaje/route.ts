import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guard";
import { rozlozUcet } from "@/lib/faktury/iban";

export const dynamic = "force-dynamic";

/** Fakturační údaje firmy. Jen správce. */
export async function PUT(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const ucet = String(b.ucet ?? "").trim();
  // Neplatný účet by rozbil QR platbu na každé faktuře.
  if (ucet && !rozlozUcet(ucet)) {
    return NextResponse.json(
      { error: "Číslo účtu není ve tvaru předčíslí-číslo/kód banky." },
      { status: 400 }
    );
  }

  const db = serviceClient();
  const { error } = await db.from("fakturacni_udaje").upsert({
    id: 1,
    nazev: String(b.nazev ?? "").trim() || "BETIMPERIUM s.r.o.",
    ico: String(b.ico ?? "").trim() || null,
    dic: String(b.dic ?? "").trim() || null,
    adresa: String(b.adresa ?? "").trim() || null,
    ucet: ucet || null,
    platce_dph: Boolean(b.platce_dph),
    splatnost_dni: Number(b.splatnost_dni) || 14,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
