import { NextResponse } from "next/server";
import { roleOf } from "@/lib/auth/guard";
import { posliPush } from "@/lib/push/posli";

export const dynamic = "force-dynamic";

/** Zkušební notifikace na vlastní zařízení. */
export async function POST() {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  // Zkouška ignoruje volby i tiché hodiny by nedávala smysl — když
  // je ticho, má se to poznat právě teď.
  const odeslano = await posliPush([me.id], "chat", {
    titulek: "BETIMPERIUM",
    text: "Zkušební notifikace. Takhle bude vypadat.",
    url: "/dashboard/notifikace",
    tag: "test",
  });

  return NextResponse.json({
    odeslano,
    zprava: odeslano > 0
      ? `Odesláno na ${odeslano} ${odeslano === 1 ? "zařízení" : "zařízení"}.`
      : "Neodesláno. Zkontroluj, že máš povolené notifikace a zapnutý týmový chat.",
  });
}
