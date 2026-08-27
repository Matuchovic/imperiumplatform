import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { otiskZarizeni } from "@/lib/bezpecnost/otisk";

export const dynamic = "force-dynamic";

/** Bez aktivity dvě minuty už člověk u počítače není. */
const ZIVY_MS = 2 * 60_000;

/**
 * Tep přítomnosti.
 *
 * Relace se zapisuje při načtení stránky, ale přepínání sekcí
 * probíhá v prohlížeči a server o něm neví. Bez tepu by proto
 * po půl hodině vypadalo, že nikdo není přihlášený.
 */
export async function POST() {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  const h = await headers();
  const otisk = otiskZarizeni(h.get("user-agent") ?? "", h.get("accept-language"));

  const db = serviceClient();
  await db.from("relace")
    .update({ posledni: new Date().toISOString() })
    .eq("user_id", me.id)
    .eq("otisk", otisk)
    .is("ukoncena_at", null);

  return NextResponse.json({ ok: true });
}

/** Kdo je právě na platformě. */
export async function GET() {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ lide: [] });
  }

  const db = serviceClient();
  const zivy = new Date(Date.now() - ZIVY_MS).toISOString();

  /**
   * Jména se dotahují zvlášť.
   *
   * Relace odkazuje na auth.users, ne na profiles — vnořený dotaz
   * by to spojení nenašel a vrátil prázdno.
   */
  const { data } = await db.from("relace")
    .select("user_id, posledni, zarizeni, system, pwa")
    .is("ukoncena_at", null)
    .gte("posledni", zivy)
    .order("posledni", { ascending: false })
    .limit(50);

  const idcka = [...new Set((data ?? []).map((r) => r.user_id as string))];
  const { data: profily } = idcka.length
    ? await db.from("profiles").select("id, name, avatar_efekt").in("id", idcka)
    : { data: [] };

  const jmena = new Map(
    ((profily ?? []) as { id: string; name: string; avatar_efekt: string | null }[])
      .map((p) => [p.id, p])
  );

  // Jeden člověk může mít víc zařízení — v seznamu má být jednou.
  const podleCloveka = new Map<string, {
    id: string; jmeno: string; efekt: string;
    zarizeni: string[]; posledni: string;
  }>();

  for (const r of (data ?? []) as {
    user_id: string; posledni: string; zarizeni: string; system: string; pwa: boolean;
  }[]) {
    const profil = jmena.get(r.user_id);
    const kus = `${r.system}${r.pwa ? " (aplikace)" : ""}`;
    const uz = podleCloveka.get(r.user_id);
    if (uz) {
      if (!uz.zarizeni.includes(kus)) uz.zarizeni.push(kus);
      continue;
    }
    podleCloveka.set(r.user_id, {
      id: r.user_id,
      jmeno: profil?.name ?? "neznámý",
      efekt: profil?.avatar_efekt ?? "zadny",
      zarizeni: [kus],
      posledni: r.posledni,
    });
  }

  return NextResponse.json({ lide: [...podleCloveka.values()] });
}
