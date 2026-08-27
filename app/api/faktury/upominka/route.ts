import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Zápis odeslané upomínky. Text se skládá v prohlížeči, tady se eviduje. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !["ceo", "vyvojar", "ucetni", "manazer"].includes(me.role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: { faktura_id?: number; uroven?: string };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  if (typeof b.faktura_id !== "number" ||
      !["prvni", "druha", "predzalobni"].includes(String(b.uroven))) {
    return NextResponse.json({ error: "Neplatná upomínka." }, { status: 400 });
  }

  const db = serviceClient();
  const [{ data: profil }, { data: f }] = await Promise.all([
    db.from("profiles").select("name").eq("id", me.id).maybeSingle<{ name: string }>(),
    db.from("faktury").select("cislo").eq("id", b.faktura_id).maybeSingle<{ cislo: string }>(),
  ]);

  const { error } = await db.from("upominky").insert({
    faktura_id: b.faktura_id,
    uroven: b.uroven,
    odeslal: me.id,
    odeslal_jmeno: profil?.name ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: "faktura.reminded", entity: "faktury", entityId: String(b.faktura_id),
    actorId: me.id, source: "manual",
    reason: `Upomínka (${b.uroven}) k faktuře ${f?.cislo ?? b.faktura_id}`,
  });

  return NextResponse.json({ ok: true });
}
