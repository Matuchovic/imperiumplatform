import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { cestaVUlozisti, MAX_SOUBOR } from "@/lib/cloud/soubory";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nahrání přílohy ke zprávě.
 *
 * Vlastní cesta místo API cloudu: to vyžaduje PIN, protože chrání
 * procházení celého úložiště. Přiložit soubor ke zprávě je něco
 * jiného — a kdo má PIN zapnutý, nemá kvůli tomu přijít o možnost
 * poslat kolegovi fakturu.
 *
 * Soubor přesto končí v cloudu, ne vedle něj. Jedna smlouva
 * na jednom místě.
 */
export async function POST(req: Request) {
  const me = await roleOf();
  if (!me || !jeTym(me.role as Role)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }

  const form = await req.formData();
  const soubor = form.get("soubor") as File | null;
  if (!soubor) return NextResponse.json({ error: "Chybí soubor." }, { status: 400 });

  if (soubor.size > MAX_SOUBOR) {
    return NextResponse.json(
      { error: `Soubor je větší než ${Math.round(MAX_SOUBOR / 1024 / 1024)} MB.` },
      { status: 413 }
    );
  }

  const db = serviceClient();
  const cesta = cestaVUlozisti(soubor.name);

  const { error: chybaUlozeni } = await db.storage
    .from("cloud")
    .upload(cesta, soubor, { contentType: soubor.type || undefined, upsert: false });

  if (chybaUlozeni) {
    log("error", "betmail", "nahrání přílohy selhalo", { error: chybaUlozeni.message });
    return NextResponse.json({ error: `Nahrání selhalo: ${chybaUlozeni.message}` }, { status: 500 });
  }

  const { data: profil } = await db.from("profiles").select("name").eq("id", me.id)
    .maybeSingle<{ name: string }>();

  const { data, error } = await db.from("dokumenty").insert({
    nazev: soubor.name.slice(0, 200),
    je_slozka: false,
    rodic_id: null,
    ulozeni: cesta,
    velikost: soubor.size,
    typ: soubor.type || null,
    druh: "ostatni",
    vlozil: me.id,
    vlozil_jmeno: profil?.name ?? null,
  }).select("id, nazev, velikost").single();

  if (error) {
    // Zápis selhal, ale soubor už v bucketu leží — bez úklidu
    // by tam zůstal navždy a nikdo by o něm nevěděl.
    await db.storage.from("cloud").remove([cesta]).catch(() => undefined);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ soubor: data });
}
