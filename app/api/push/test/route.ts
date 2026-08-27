import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { posliPush, pushPripraven } from "@/lib/push/posli";
import { jeTicho, VYCHOZI_VOLBY, type Volby } from "@/lib/push/druhy";

export const dynamic = "force-dynamic";

/**
 * Zkušební notifikace.
 *
 * Když se nic neodešle, řekne proč. Obecné „zkontroluj nastavení"
 * je k ničemu — příčin je pět a bez rozlišení se hledají dlouho.
 */
export async function POST() {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  if (!pushPripraven()) {
    return NextResponse.json({
      odeslano: 0,
      zprava: "Chybí klíče VAPID v prostředí. Doplň NEXT_PUBLIC_VAPID_KLIC a VAPID_TAJNY_KLIC.",
    });
  }

  const db = serviceClient();
  const [odbery, volby] = await Promise.all([
    db.from("push_odbery").select("id, zarizeni").eq("user_id", me.id),
    db.from("notifikace_volby").select("*").eq("user_id", me.id).maybeSingle<Volby>(),
  ]);

  const pocet = (odbery.data ?? []).length;
  if (pocet === 0) {
    return NextResponse.json({
      odeslano: 0,
      zprava: "Žádné přihlášené zařízení. Povolení v prohlížeči nestačí — klepni na Povolit, aby se odběr uložil.",
    });
  }

  const v = volby.data ?? VYCHOZI_VOLBY;
  if (!v.chat) {
    return NextResponse.json({
      odeslano: 0,
      zprava: "Týmový chat máš vypnutý, a zkouška se posílá jako on. Zapni ho, nebo zkus jiný druh.",
    });
  }
  if (jeTicho(v.ticho_od, v.ticho_do)) {
    return NextResponse.json({
      odeslano: 0,
      zprava: `Právě jsou tiché hodiny (${v.ticho_od}–${v.ticho_do}). Notifikace se v nich neposílají.`,
    });
  }

  const odeslano = await posliPush([me.id], "chat", {
    titulek: "BETIMPERIUM",
    text: "Zkušební notifikace. Takhle bude vypadat.",
    url: "/dashboard/notifikace",
    tag: "test",
  });

  if (odeslano === 0) {
    return NextResponse.json({
      odeslano: 0,
      // Sem se dostane jen odběr, který poskytovatel odmítl —
      // typicky po změně klíčů VAPID nebo po smazání aplikace.
      zprava: `Zařízení jsou přihlášená (${pocet}), ale doručení selhalo. Nejčastěji po změně klíčů VAPID — odeber zařízení dole a povol notifikace znovu.`,
    });
  }

  return NextResponse.json({
    odeslano,
    zprava: `Odesláno na ${odeslano} ${odeslano === 1 ? "zařízení" : odeslano < 5 ? "zařízení" : "zařízení"}.`,
  });
}
