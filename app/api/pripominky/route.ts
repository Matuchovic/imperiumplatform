import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { posliPush } from "@/lib/push/posli";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Časové připomínky.
 *
 * Události v kalendáři a termíny úkolů nemá kdo ohlásit — nikdo
 * je nevyvolá kliknutím. Tenhle koncový bod pouští cron.
 *
 * Spouští se každých patnáct minut. Okno je proto patnáctiminutové
 * a posun o čtvrt hodiny dopředu, aby nic nevypadlo mezi dvěma běhy.
 */
export async function GET(req: Request) {
  const tajemstvi = process.env.CRON_SECRET;
  const hlavicka = req.headers.get("authorization");
  if (tajemstvi && hlavicka !== `Bearer ${tajemstvi}`) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 401 });
  }

  const db = serviceClient();
  const ted = new Date();
  const dnes = ted.toISOString().slice(0, 10);
  let kalendar = 0;
  let ukoly = 0;

  try {
    // ---- události za patnáct minut ----
    const za15 = new Date(ted.getTime() + 15 * 60_000);
    const za30 = new Date(ted.getTime() + 30 * 60_000);
    const cas = (d: Date) => d.toTimeString().slice(0, 5);

    const { data: udalosti } = await db
      .from("udalosti")
      .select("nazev, cas_od, misto, vlastnik, sdilena")
      .eq("datum", dnes)
      .eq("cely_den", false)
      .gte("cas_od", cas(za15))
      .lt("cas_od", cas(za30));

    for (const u of (udalosti ?? []) as {
      nazev: string; cas_od: string; misto: string | null; vlastnik: string; sdilena: boolean;
    }[]) {
      // Firemní událost jde celému týmu, osobní jen vlastníkovi.
      let komu = [u.vlastnik];
      if (u.sdilena) {
        const { data } = await db.from("profiles").select("id").neq("role", "klient");
        komu = (data ?? []).map((p) => p.id as string);
      }

      kalendar += await posliPush(komu, "kalendar", {
        titulek: u.nazev,
        text: `Za 15 minut${u.misto ? ` · ${u.misto}` : ""}`,
        url: "/dashboard",
        tag: `udalost-${u.nazev}`,
      });
    }

    // ---- úkoly s termínem dnes, jednou ráno ----
    if (ted.getHours() === 8 && ted.getMinutes() < 15) {
      const { data: dnesni } = await db
        .from("ukoly").select("nazev, vytvoril").eq("hotovo", false).eq("termin", dnes);

      const podleLidi = new Map<string, string[]>();
      for (const u of (dnesni ?? []) as { nazev: string; vytvoril: string | null }[]) {
        // Úkol bez autora nemá komu chodit.
        if (!u.vytvoril) continue;
        podleLidi.set(u.vytvoril, [...(podleLidi.get(u.vytvoril) ?? []), u.nazev]);
      }

      for (const [kdo, nazvy] of podleLidi) {
        ukoly += await posliPush([kdo], "ukoly", {
          titulek: nazvy.length === 1 ? "Úkol na dnešek" : `${nazvy.length} úkolů na dnešek`,
          text: nazvy.slice(0, 3).join(", "),
          url: "/dashboard/ukoly",
          tag: "ukoly-dnes",
        });
      }
    }
  } catch (err) {
    log("error", "pripominky", "běh selhal", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Běh selhal." }, { status: 500 });
  }

  log("info", "pripominky", "hotovo", { kalendar, ukoly });
  return NextResponse.json({ kalendar, ukoly });
}
