import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { platnyPin, otiskni, sedi, stavPokusu, dalsiBlokace, BLOKACE_MIN } from "@/lib/cloud/zamek";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

const COOKIE = "bi_cloud";
const PLATNOST_MIN = 30;

type Radek = { otisk: string; pokusy: number; blokovano_do: string | null };

/** Stav zámku: má uživatel PIN a je zrovna odemčeno? */
export async function GET() {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const db = serviceClient();
  const { data } = await db.from("cloud_zamek")
    .select("otisk, pokusy, blokovano_do").eq("user_id", me.id).maybeSingle<Radek>();

  const jar = await cookies();
  const odemceno = jar.get(COOKIE)?.value === me.id;
  const stav = data ? stavPokusu(data.pokusy, data.blokovano_do) : null;

  return NextResponse.json({
    maPin: Boolean(data),
    odemceno: Boolean(data) && odemceno,
    blokovano: stav?.blokovano ?? false,
    zbyva: stav?.zbyva ?? null,
    doKdy: stav?.doKdy ?? null,
  });
}

/** Nastavení PINu, nebo změna stávajícího. */
export async function PUT(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: { pin?: string; stary?: string };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const pin = b.pin ?? "";
  if (!platnyPin(pin)) {
    return NextResponse.json({ error: "PIN musí být šest číslic." }, { status: 400 });
  }

  const db = serviceClient();
  const { data } = await db.from("cloud_zamek")
    .select("otisk, pokusy, blokovano_do").eq("user_id", me.id).maybeSingle<Radek>();

  // Změna PINu vyžaduje ten stávající. Jinak by stačilo dostat se
  // k otevřené relaci a zámek přepsat.
  if (data && !sedi(b.stary ?? "", data.otisk)) {
    return NextResponse.json({ error: "Stávající PIN nesouhlasí." }, { status: 403 });
  }

  const { error } = await db.from("cloud_zamek").upsert({
    user_id: me.id,
    otisk: otiskni(pin),
    zmeneno: new Date().toISOString(),
    pokusy: 0,
    blokovano_do: null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: data ? "cloud.pin_changed" : "cloud.pin_set",
    entity: "cloud_zamek", entityId: me.id,
    actorId: me.id, source: "manual",
    reason: data ? "Změněn PIN k cloudu" : "Nastaven PIN k cloudu",
  });

  return NextResponse.json({ ok: true });
}

/** Odemčení. Při úspěchu se vydá cookie platná půl hodiny. */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  let b: { pin?: string };
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }

  const db = serviceClient();
  const { data } = await db.from("cloud_zamek")
    .select("otisk, pokusy, blokovano_do").eq("user_id", me.id).maybeSingle<Radek>();

  if (!data) return NextResponse.json({ error: "PIN není nastavený." }, { status: 400 });

  const stav = stavPokusu(data.pokusy, data.blokovano_do);
  if (stav.blokovano) {
    return NextResponse.json(
      { error: `Příliš mnoho pokusů. Zkus to za ${BLOKACE_MIN} minut.`, blokovano: true },
      { status: 429 }
    );
  }

  if (!sedi(b.pin ?? "", data.otisk)) {
    const blokace = dalsiBlokace(data.pokusy);
    await db.from("cloud_zamek")
      .update({ pokusy: data.pokusy + 1, blokovano_do: blokace })
      .eq("user_id", me.id);

    log("warn", "cloud", "neúspěšné odemčení", { userId: me.id, pokus: data.pokusy + 1 });

    return NextResponse.json(
      {
        error: blokace
          ? `Příliš mnoho pokusů. Zkus to za ${BLOKACE_MIN} minut.`
          : `Nesprávný PIN. Zbývá ${stav.zbyva - 1} pokusů.`,
        blokovano: Boolean(blokace),
      },
      { status: 403 }
    );
  }

  await db.from("cloud_zamek")
    .update({ pokusy: 0, blokovano_do: null }).eq("user_id", me.id);

  const jar = await cookies();
  jar.set(COOKIE, me.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PLATNOST_MIN * 60,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}

/** Zamčení. */
export async function DELETE() {
  const jar = await cookies();
  jar.delete(COOKIE);
  return NextResponse.json({ ok: true });
}
