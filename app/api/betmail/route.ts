import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { posliPush } from "@/lib/push/posli";
import type { Slozka } from "@/lib/betmail/zpravy";

export const dynamic = "force-dynamic";

/** Seznam zpráv ve složce plus lidé, kterým jde psát. */
export async function GET(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const slozka = (new URL(req.url).searchParams.get("slozka") ?? "dorucene") as Slozka;
  const db = serviceClient();

  let q = db.from("betmail").select(
    "id, predmet, telo, odesilatel, odesilatel_jmeno, prijemce, priorita, odpoved_na, prilohy, precteno_at, archivovano, created_at"
  );

  if (slozka === "kos") {
    q = q.not("smazano_at", "is", null).or(`prijemce.eq.${me.id},odesilatel.eq.${me.id}`);
  } else if (slozka === "odeslane") {
    q = q.is("smazano_at", null).eq("odesilatel", me.id);
  } else {
    q = q.is("smazano_at", null).eq("prijemce", me.id).eq("archivovano", slozka === "archiv");
  }

  const [zpravy, lide, reakce, dokumenty] = await Promise.all([
    q.order("created_at", { ascending: false }).limit(200),
    db.from("profiles").select("id, name, role").neq("role", "klient").neq("id", me.id).order("name"),
    db.from("betmail_reakce").select("zprava_id, user_id, znak").limit(2000),
    // Metadata příloh — bez nich by rozhraní znalo jen čísla.
    db.from("dokumenty").select("id, nazev, velikost").is("smazano_at", null).limit(1000),
  ]);

  if (zpravy.error) return NextResponse.json({ error: zpravy.error.message }, { status: 500 });

  return NextResponse.json({
    zpravy: zpravy.data ?? [],
    lide: lide.data ?? [],
    reakce: reakce.data ?? [],
    soubory: dokumenty.data ?? [],
  });
}

/** Odeslání. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const predmet = String(b.predmet ?? "").trim().slice(0, 200);
  const telo = String(b.telo ?? "").trim().slice(0, 20000);
  const prijemci = Array.isArray(b.prijemci) ? (b.prijemci as string[]) : [];

  if (!predmet) return NextResponse.json({ error: "Chybí předmět." }, { status: 400 });
  if (!telo) return NextResponse.json({ error: "Zpráva je prázdná." }, { status: 400 });
  if (prijemci.length === 0) return NextResponse.json({ error: "Vyber aspoň jednoho příjemce." }, { status: 400 });

  const db = serviceClient();
  const { data: profil } = await db.from("profiles").select("name").eq("id", me.id)
    .maybeSingle<{ name: string }>();

  // Každý příjemce dostane vlastní záznam, ne sdílený. Jinak by
  // přečtení jedním označilo zprávu za přečtenou i ostatním.
  const radky = prijemci.map((p) => ({
    predmet, telo,
    odesilatel: me.id,
    odesilatel_jmeno: profil?.name ?? null,
    prijemce: p,
    priorita: ["nizka", "bezna", "vysoka"].includes(String(b.priorita)) ? b.priorita : "bezna",
    odpoved_na: typeof b.odpoved_na === "number" ? b.odpoved_na : null,
    prilohy: Array.isArray(b.prilohy) ? b.prilohy : [],
  }));

  const { data, error } = await db.from("betmail").insert(radky).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notifikace nesmí položit odeslání — proto bez čekání.
  posliPush(prijemci, "chat", {
    titulek: `Betmail — ${profil?.name ?? "nová zpráva"}`,
    text: predmet,
    url: "/dashboard/betmail",
    tag: "betmail",
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, pocet: (data ?? []).length });
}

/** Přečteno, archivace, koš, obnovení. */
export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: { id?: number; akce?: string };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }
  if (typeof b.id !== "number") return NextResponse.json({ error: "Chybí zpráva." }, { status: 400 });

  const zmena: Record<string, unknown> = {};
  if (b.akce === "precteno") zmena.precteno_at = new Date().toISOString();
  else if (b.akce === "neprecteno") zmena.precteno_at = null;
  else if (b.akce === "archivovat") zmena.archivovano = true;
  else if (b.akce === "vratit") { zmena.archivovano = false; zmena.smazano_at = null; }
  else if (b.akce === "smazat") zmena.smazano_at = new Date().toISOString();
  else return NextResponse.json({ error: "Neznámá akce." }, { status: 400 });

  const db = serviceClient();
  // Cizí zprávu upravit nejde — podmínka je na serveru, ne v rozhraní.
  const { error } = await db.from("betmail").update(zmena)
    .eq("id", b.id)
    .or(`prijemce.eq.${me.id},odesilatel.eq.${me.id}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
