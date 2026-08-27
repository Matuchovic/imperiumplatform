import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guard";
import { UVAZKY } from "@/lib/personal/oddeleni";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const datum = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

/** Úprava pracovních údajů. Jen správce — jsou to osobní data. */
export async function PUT(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const id = String(b.id ?? "");
  if (!id) return NextResponse.json({ error: "Chybí člověk." }, { status: 400 });

  const nastup = datum(b.nastup);
  const ukonceni = datum(b.ukonceni);

  // Odchod před nástupem by rozbil výpočet délky působení.
  if (nastup && ukonceni && ukonceni < nastup) {
    return NextResponse.json(
      { error: "Datum ukončení nemůže být před nástupem." },
      { status: 400 }
    );
  }

  const db = serviceClient();
  const { data: pred } = await db
    .from("profiles").select("name, ukonceni").eq("id", id)
    .maybeSingle<{ name: string; ukonceni: string | null }>();

  if (!pred) return NextResponse.json({ error: "Člověk nenalezen." }, { status: 404 });

  const { error } = await db.from("profiles").update({
    pozice: String(b.pozice ?? "").trim() || null,
    telefon: String(b.telefon ?? "").trim() || null,
    nastup,
    ukonceni,
    uvazek: Object.keys(UVAZKY).includes(String(b.uvazek)) ? b.uvazek : null,
    poznamka_hr: String(b.poznamka_hr ?? "").trim() || null,
  }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ukončení poměru je událost, kterou má smysl mít v auditu.
  if (ukonceni && !pred.ukonceni) {
    await audit({
      action: "personal.ended", entity: "profiles", entityId: id,
      actorId: me.id, source: "manual",
      reason: `Ukončen pracovní poměr: ${pred.name} k ${ukonceni}`,
    });
  }

  return NextResponse.json({ ok: true });
}
