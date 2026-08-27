import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { rozsah } from "@/lib/kalendar/mesic";

export const dynamic = "force-dynamic";

/** Události pro daný měsíc — firemní plus vlastní osobní. */
export async function GET(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const u = new URL(req.url);
  const rok = Number(u.searchParams.get("rok")) || new Date().getFullYear();
  const mesic = Number(u.searchParams.get("mesic"));
  const r = rozsah(rok, Number.isInteger(mesic) ? mesic : new Date().getMonth());

  const db = serviceClient();
  // Osobní kalendář je cizí lidem nepřístupný — proto ta podmínka
  // na vlastníka, ne jen filtr v rozhraní.
  const { data, error } = await db
    .from("udalosti")
    .select("id, nazev, sdilena, datum, cas_od, cas_do, cely_den, misto, s_kym, barva, vlastnik")
    .gte("datum", r.od).lte("datum", r.do)
    .or(`sdilena.eq.true,vlastnik.eq.${me.id}`)
    .order("datum").order("cas_od", { nullsFirst: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ udalosti: data ?? [] });
}

/** Nová událost. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const nazev = String(b.nazev ?? "").trim();
  const datum = String(b.datum ?? "");
  if (!nazev) return NextResponse.json({ error: "Chybí název." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return NextResponse.json({ error: "Neplatné datum." }, { status: 400 });
  }

  const celyDen = Boolean(b.cely_den);
  const db = serviceClient();
  const { data, error } = await db.from("udalosti").insert({
    nazev,
    sdilena: Boolean(b.sdilena),
    datum,
    // Při celodenní události nemá čas smysl ukládat.
    cas_od: celyDen ? null : (b.cas_od || null),
    cas_do: celyDen ? null : (b.cas_do || null),
    cely_den: celyDen,
    misto: (b.misto as string)?.trim() || null,
    s_kym: (b.s_kym as string)?.trim() || null,
    barva: ["zelena", "jantar", "modra", "cervena"].includes(String(b.barva)) ? b.barva : "zelena",
    vlastnik: me.id,
  }).select("id, nazev, sdilena, datum, cas_od, cas_do, cely_den, misto, s_kym, barva, vlastnik").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ udalost: data });
}

/** Smazání. Cizí osobní událost smazat nejde. */
export async function DELETE(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Chybí událost." }, { status: 400 });

  const db = serviceClient();
  const { data } = await db.from("udalosti").select("vlastnik, sdilena").eq("id", id)
    .maybeSingle<{ vlastnik: string; sdilena: boolean }>();

  if (!data) return NextResponse.json({ error: "Událost nenalezena." }, { status: 404 });
  // Firemní událost smí smazat kdokoli z týmu, osobní jen její vlastník.
  if (!data.sdilena && data.vlastnik !== me.id) {
    return NextResponse.json({ error: "Cizí osobní událost." }, { status: 403 });
  }

  const { error } = await db.from("udalosti").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
