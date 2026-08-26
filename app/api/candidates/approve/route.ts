import { NextResponse } from "next/server";
import { decideCandidate } from "@/lib/engine/approve";
import { roleOf } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/** Schválit nebo zamítnout kandidáta. Jen manažer a admin. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || me.role === "klient") {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let body: { candidateId?: string; decision?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  }

  const { candidateId, decision, note } = body;
  if (!candidateId) return NextResponse.json({ error: "Chybí kandidát." }, { status: 400 });
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "Neplatné rozhodnutí." }, { status: 400 });
  }

  const result = await decideCandidate(candidateId, me.id, decision, note);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 500 });

  return NextResponse.json(result);
}
