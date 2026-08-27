import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeSprava, type Role } from "@/components/admin/nav";
import { KATALOG, agentPodleKlice } from "@/lib/agenti/katalog";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Stav garáže: kdo běží, co udělal, co čeká na schválení. */
export async function GET() {
  const me = await roleOf();
  if (!me || !jeSprava(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const db = serviceClient();
  const [stavy, behy, navrhy] = await Promise.all([
    db.from("agenti").select("*"),
    db.from("agent_beh").select("klic, zacatek, konec, stav, shrnuti, vysledku")
      .order("zacatek", { ascending: false }).limit(40),
    db.from("agent_navrhy").select("id, klic, druh, nazev, created_at")
      .eq("stav", "ceka").order("created_at", { ascending: false }).limit(40),
  ]);

  const podleKlice = new Map(
    ((stavy.data ?? []) as { klic: string }[]).map((s) => [s.klic, s])
  );

  return NextResponse.json({
    agenti: KATALOG.map((a) => {
      const s = podleKlice.get(a.klic) as {
        zapnuty?: boolean; posledni_beh?: string | null; interval_min?: number | null;
      } | undefined;

      return {
        ...a,
        zapnuty: Boolean(s?.zapnuty),
        posledni_beh: s?.posledni_beh ?? null,
        interval: s?.interval_min ?? a.interval,
        // Kolik jeho návrhů čeká. Bez čísla není poznat, že něco chce.
        ceka: (navrhy.data ?? []).filter((n) => n.klic === a.klic).length,
      };
    }),
    behy: behy.data ?? [],
    navrhy: navrhy.data ?? [],
  });
}

/** Zapnutí, vypnutí, ruční spuštění. */
export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me || !jeSprava(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: { klic?: string; akce?: string; interval?: number };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const agent = agentPodleKlice(String(b.klic ?? ""));
  if (!agent) return NextResponse.json({ error: "Neznámý agent." }, { status: 400 });

  // Agent v přípravě nejde zapnout — tlačítko by slibovalo něco,
  // co se nestane.
  if (!agent.pripraven && b.akce === "zapnout") {
    return NextResponse.json(
      { error: `${agent.nazev} zatím není hotový.` },
      { status: 400 }
    );
  }

  const db = serviceClient();

  if (b.akce === "zapnout" || b.akce === "vypnout") {
    const zapnuty = b.akce === "zapnout";
    const { error } = await db.from("agenti").upsert({
      klic: agent.klic,
      zapnuty,
      interval_min: typeof b.interval === "number" ? b.interval : agent.interval,
      updated_at: new Date().toISOString(),
    }, { onConflict: "klic" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await audit({
      action: zapnuty ? "agent.enabled" : "agent.disabled",
      entity: "agenti", entityId: agent.klic, actorId: me.id, source: "manual",
      reason: `${zapnuty ? "Zapnut" : "Vypnut"} ${agent.nazev}`,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Neznámá akce." }, { status: 400 });
}
