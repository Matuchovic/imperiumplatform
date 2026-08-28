import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guard";
import { UDALOSTI, noveTajemstvi, type Udalost } from "@/lib/apiklice/webhook";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  const db = serviceClient();
  const { data } = await db.from("api_webhooky")
    .select("id, nazev, url, udalosti, aktivni, posledni_ok, posledni_chyba, neuspechu, created_at")
    .order("created_at", { ascending: false });

  return NextResponse.json({ webhooky: data ?? [], udalosti: UDALOSTI });
}

export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const url = String(b.url ?? "").trim();
  const nazev = String(b.nazev ?? "").trim().slice(0, 80);
  const udalosti = Array.isArray(b.udalosti) ? (b.udalosti as string[]) : [];

  if (!nazev) return NextResponse.json({ error: "Chybí název." }, { status: 400 });
  if (udalosti.length === 0 || !udalosti.every((u) => u in UDALOSTI)) {
    return NextResponse.json({ error: "Vyber aspoň jednu platnou událost." }, { status: 400 });
  }

  /**
   * Jen https a jen veřejná adresa.
   *
   * Bez toho by šlo webhookem donutit server volat na vnitřní
   * adresy sítě — klasický útok typu SSRF.
   */
  let cil: URL;
  try { cil = new URL(url); }
  catch { return NextResponse.json({ error: "Neplatná adresa." }, { status: 400 }); }

  if (cil.protocol !== "https:") {
    return NextResponse.json({ error: "Adresa musí být https." }, { status: 400 });
  }
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/i
        .test(cil.hostname)) {
    return NextResponse.json({ error: "Vnitřní adresy nejsou povolené." }, { status: 400 });
  }

  const tajemstvi = noveTajemstvi();
  const db = serviceClient();
  const { data, error } = await db.from("api_webhooky").insert({
    nazev, url: cil.toString(), tajemstvi,
    udalosti: udalosti as Udalost[],
    vytvoril: me.id,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: "webhook.created", entity: "api_webhooky", entityId: String(data.id),
    actorId: me.id, source: "manual", reason: `Vytvořen webhook ${nazev} → ${cil.hostname}`,
  });

  // Tajemství se ukáže jednou, stejně jako klíč.
  return NextResponse.json({ tajemstvi, id: data.id }, { status: 201 });
}

export async function DELETE(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Jen správce." }, { status: 403 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Chybí webhook." }, { status: 400 });

  const db = serviceClient();
  const { error } = await db.from("api_webhooky").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: "webhook.deleted", entity: "api_webhooky", entityId: String(id),
    actorId: me.id, source: "manual", reason: `Smazán webhook ${id}`,
  });

  return NextResponse.json({ ok: true });
}
