import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/** Pole, která smí přijít z formuláře. Cokoliv jiného se zahodí. */
const ALLOWED = [
  "platform_name", "tagline", "description", "language", "currency",
  "timezone", "week_start", "allow_signup", "allow_trial", "approve_clients",
  "require_2fa_staff", "default_units", "default_sport", "tip_expiry_minutes",
  "default_week_limit", "default_loss_limit", "reality_check_min", "retention_days",
] as const;

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }
  const db = serviceClient();
  const { data, error } = await db.from("app_settings").select("*").eq("id", true).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PUT(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  }

  // Bílá listina místo předání celého těla — jinak by šlo přepsat i id.
  const patch: Record<string, unknown> = {};
  for (const key of ALLOWED) if (key in body) patch[key] = body[key];

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Není co uložit." }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();
  patch.updated_by = me.id;

  const db = serviceClient();
  const { error } = await db.from("app_settings").update(patch).eq("id", true);
  if (error) {
    console.error("[settings]", error);
    return NextResponse.json({ error: "Uložení selhalo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
