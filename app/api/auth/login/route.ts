import { NextResponse } from "next/server";
import { findUserByEmail, verifyPassword } from "@/lib/db";
import { createSession, SESSION_COOKIE } from "@/lib/session";

// Jednoduchý in-memory rate limit. V produkci nahraď Redisem / Upstash.
const attempts = new Map<string, { count: number; reset: number }>();
const WINDOW = 10 * 60 * 1000;
const MAX = 8;

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

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";

  if (limited(ip)) {
    return NextResponse.json(
      { error: "Příliš mnoho pokusů. Zkus to znovu za 10 minut." },
      { status: 429 }
    );
  }

  let body: { email?: string; password?: string; remember?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  }

  const { email = "", password = "", remember = false } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Vyplň e-mail i heslo." }, { status: 400 });
  }

  const user = findUserByEmail(email);

  // Stejná odpověď pro neexistující účet i špatné heslo — neprozrazuje,
  // které e-maily jsou v systému registrované.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "E-mail nebo heslo nesouhlasí." },
      { status: 401 }
    );
  }

  const token = await createSession(
    { sub: user.id, email: user.email, name: user.name, plan: user.plan },
    remember
  );

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
  });

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12,
  });

  return res;
}
