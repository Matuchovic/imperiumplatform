import { NextResponse } from "next/server";
import { randomBytes, scryptSync } from "crypto";
import { serviceClient } from "@/lib/supabase/server";
import { createSession, isConfigured, SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

const attempts = new Map<string, { count: number; reset: number }>();
const WINDOW = 60 * 60 * 1000;
const MAX = 5;

function limited(key: string) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.reset) {
    attempts.set(key, { count: 1, reset: now + WINDOW });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX;
}

/** Věk se ověřuje na serveru i v databázi — formulář obejde kdokoliv. */
function isAdult(birth: string): boolean {
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return false;
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 18);
  return d <= limit;
}

export async function POST(req: Request) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "Registrace je dočasně nedostupná — server není nastavený." },
        { status: 503 }
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    if (limited(ip)) {
      return NextResponse.json(
        { error: "Příliš mnoho pokusů. Zkus to za hodinu." },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
    }

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const birthDate = String(body.birthDate ?? "");
    const terms = Boolean(body.terms);
    const marketing = Boolean(body.marketing);

    if (name.length < 2)
      return NextResponse.json({ error: "Vyplň jméno." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return NextResponse.json({ error: "E-mail nemá platný tvar." }, { status: 400 });
    if (password.length < 10)
      return NextResponse.json({ error: "Heslo musí mít aspoň 10 znaků." }, { status: 400 });
    if (!terms)
      return NextResponse.json({ error: "Bez souhlasu s podmínkami to nejde." }, { status: 400 });
    if (!isAdult(birthDate))
      return NextResponse.json(
        { error: "Službu smí používat jen osoby od 18 let." },
        { status: 403 }
      );

    const db = serviceClient();

    const { data: existing } = await db
      .from("app_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Na tenhle e-mail už účet existuje. Zkus se přihlásit." },
        { status: 409 }
      );
    }

    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");

    const { data: user, error } = await db
      .from("app_users")
      .insert({
        email,
        name,
        birth_date: birthDate,
        password_hash: `${salt}:${hash}`,
        marketing_ok: marketing,
        terms_at: new Date().toISOString(),
      })
      .select("id, email, name, plan")
      .single();

    if (error || !user) {
      console.error("[register]", error);
      return NextResponse.json({ error: "Účet se nepodařilo založit." }, { status: 500 });
    }

    const token = await createSession(
      { sub: user.id, email: user.email, name: user.name, plan: user.plan },
      false
    );

    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (err) {
    console.error("[register] neočekávaná chyba:", err);
    return NextResponse.json({ error: "Na serveru došlo k chybě." }, { status: 500 });
  }
}
