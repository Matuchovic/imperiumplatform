import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeSprava, ROLE_LABEL, type Role } from "@/components/admin/nav";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

const PLATNE = Object.keys(ROLE_LABEL) as Role[];

/** Seznam týmu. Vidí ho jen ten, kdo smí role měnit. */
export async function GET() {
  const me = await roleOf();
  if (!me || !jeSprava(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const db = serviceClient();
  const { data, error } = await db
    .from("profiles")
    .select("id, name, role, created_at")
    .neq("role", "klient")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tym: data ?? [] });
}

/** Změna role. */
export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me || !jeSprava(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let body: { userId?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  }

  const { userId, role } = body;
  if (!userId) return NextResponse.json({ error: "Chybí uživatel." }, { status: 400 });
  if (!role || !PLATNE.includes(role as Role)) {
    return NextResponse.json({ error: "Neznámá role." }, { status: 400 });
  }

  // Odebrat si vlastní správcovská práva je nevratné bez zásahu
  // do databáze — a kdyby to byl jediný správce, zamkne se systém.
  if (userId === me.id && !jeSprava(role as Role)) {
    return NextResponse.json(
      { error: "Vlastní správcovská práva si odebrat nemůžeš. Požádej jiného správce." },
      { status: 400 }
    );
  }

  const db = serviceClient();

  const { data: pred } = await db
    .from("profiles").select("role, name").eq("id", userId)
    .maybeSingle<{ role: string; name: string }>();

  if (!pred) return NextResponse.json({ error: "Uživatel nenalezen." }, { status: 404 });
  if (pred.role === role) return NextResponse.json({ ok: true, zmeneno: false });

  // Poslední správce nesmí zmizet, jinak role nikdo nezmění.
  if (jeSprava(pred.role as Role) && !jeSprava(role as Role)) {
    const { count } = await db
      .from("profiles").select("id", { count: "exact", head: true })
      .in("role", ["ceo", "vyvojar"]);
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Tohle je poslední správce. Nejdřív pověř někoho dalšího." },
        { status: 400 }
      );
    }
  }

  const { error } = await db.from("profiles").update({ role }).eq("id", userId);
  if (error) {
    log("error", "role", "změna role selhala", { userId, error: error.message });
    return NextResponse.json({ error: "Změna selhala." }, { status: 500 });
  }

  await audit({
    action: "role.changed",
    entity: "profiles",
    entityId: userId,
    actorId: me.id,
    source: "manual",
    previous: { role: pred.role },
    next: { role },
    reason: `Role ${pred.name}: ${pred.role} → ${role}`,
  });

  return NextResponse.json({ ok: true, zmeneno: true });
}
