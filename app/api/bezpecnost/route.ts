import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeSprava, type Role } from "@/components/admin/nav";
import { ukonciRelaci } from "@/lib/bezpecnost/relace";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Ukončení cizí relace nebo zablokování adresy. Jen správa. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeSprava(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let body: { akce?: string; id?: number; ip?: string; duvod?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  if (body.akce === "ukoncit" && body.id) {
    const ok = await ukonciRelaci(body.id, me.id);
    if (ok) {
      await audit({
        action: "role.changed", entity: "relace", entityId: String(body.id),
        actorId: me.id, source: "bezpecnost", reason: "Ruční ukončení relace",
      });
    }
    return NextResponse.json({ ok });
  }

  if (body.akce === "blokovat" && body.ip) {
    const db = serviceClient();
    const { error } = await db.from("blokovane_ip").upsert({
      ip: body.ip, duvod: body.duvod ?? "Ručně zablokováno", blokoval: me.id,
    });
    if (!error) {
      await audit({
        action: "emergency.stop", entity: "blokovane_ip", entityId: body.ip,
        actorId: me.id, source: "bezpecnost", reason: body.duvod ?? "Ruční blokace",
      });
    }
    return NextResponse.json({ ok: !error });
  }

  // Odkrytí celé adresy je samo o sobě přístup k osobnímu údaji.
  if (body.akce === "odkryt" && body.id) {
    const db = serviceClient();
    const { data } = await db.from("relace").select("ip").eq("id", body.id)
      .maybeSingle<{ ip: string }>();

    await audit({
      action: "role.changed", entity: "relace", entityId: String(body.id),
      actorId: me.id, source: "bezpecnost", reason: "Zobrazení celé IP adresy",
    });
    return NextResponse.json({ ip: data?.ip ?? null });
  }

  return NextResponse.json({ error: "Neznámá akce." }, { status: 400 });
}
