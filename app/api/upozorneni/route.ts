import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { nejblizsiSvatky, jmeninyDne } from "@/lib/svatky/jmeniny";

export const dynamic = "force-dynamic";

/**
 * Co vyžaduje pozornost.
 *
 * Sbírá se jedním dotazem na každou oblast a vrací se jen počty
 * a pár posledních položek — zvoneček není seznam, je to signál.
 */
export async function GET() {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  if (!jeTym(me.role as Role)) {
    return NextResponse.json({ polozky: [], jmeniny: jmeninyDne(), svatky: [] });
  }

  const db = serviceClient();
  const dnes = new Date().toISOString().slice(0, 10);

  const [posta, ukoly, podpora, kandidati, faktury, lide] = await Promise.all([
    db.from("betmail").select("id", { count: "exact", head: true })
      .eq("prijemce", me.id).is("precteno_at", null).is("smazano_at", null).eq("archivovano", false),
    db.from("ukoly").select("id", { count: "exact", head: true })
      .eq("hotovo", false).lte("termin", dnes),
    db.from("tikety_podpory").select("id", { count: "exact", head: true }).eq("stav", "novy"),
    db.from("candidates").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("faktury").select("id", { count: "exact", head: true })
      .eq("stav", "vystavena").lt("splatnost", dnes),
    db.from("profiles").select("id, name").neq("role", "klient"),
  ]);

  const polozky = [
    { klic: "betmail", nazev: "Nepřečtená pošta", pocet: posta.count ?? 0,
      ikona: "mail", href: "/dashboard/betmail" },
    { klic: "kandidati", nazev: "Kandidáti ke schválení", pocet: kandidati.count ?? 0,
      ikona: "target", href: "/dashboard" },
    { klic: "podpora", nazev: "Nové dotazy klientů", pocet: podpora.count ?? 0,
      ikona: "lifebuoy", href: "/dashboard/support" },
    { klic: "ukoly", nazev: "Úkoly po termínu", pocet: ukoly.count ?? 0,
      ikona: "checkbox", href: "/dashboard/ukoly" },
    { klic: "faktury", nazev: "Faktury po splatnosti", pocet: faktury.count ?? 0,
      ikona: "file-invoice", href: "/dashboard/faktury" },
  ].filter((p) => p.pocet > 0);

  return NextResponse.json({
    polozky,
    jmeniny: jmeninyDne(),
    svatky: nejblizsiSvatky(
      ((lide.data ?? []) as { id: string; name: string }[])
        .map((l) => ({ id: l.id, jmeno: l.name })),
      10
    ),
  });
}
