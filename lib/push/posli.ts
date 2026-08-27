import webpush from "web-push";
import { serviceClient } from "@/lib/supabase/server";
import { jeTicho, VYCHOZI_VOLBY, type Druh, type Volby } from "./druhy";
import { log } from "@/lib/log";

/**
 * Odesílání push notifikací.
 *
 * Klíče VAPID žijí v prostředí. Bez nich se nic neposílá a systém
 * to jen zaznamená — výpadek notifikací nesmí položit akci, která
 * je vyvolala.
 */

let pripraveno = false;

function nastav(): boolean {
  const verejny = process.env.NEXT_PUBLIC_VAPID_KLIC;
  const tajny = process.env.VAPID_TAJNY_KLIC;
  const kontakt = process.env.VAPID_KONTAKT ?? "mailto:info@betimperium.cz";
  if (!verejny || !tajny) return false;

  if (!pripraveno) {
    webpush.setVapidDetails(kontakt, verejny, tajny);
    pripraveno = true;
  }
  return true;
}

export const pushPripraven = () =>
  Boolean(process.env.NEXT_PUBLIC_VAPID_KLIC && process.env.VAPID_TAJNY_KLIC);

export type Zprava = {
  titulek: string;
  text: string;
  /** Kam skočit po klepnutí. */
  url?: string;
  /** Stejný tag nahradí předchozí zprávu místo přidání další. */
  tag?: string;
};

/**
 * Pošle notifikaci vybraným uživatelům.
 *
 * Respektuje volby i tiché hodiny. Mrtvé odběry maže — zařízení,
 * které se odhlásilo, vrací 404 nebo 410 a bez úklidu by tam
 * zůstalo navždy.
 */
export async function posliPush(userIds: string[], druh: Druh, z: Zprava): Promise<number> {
  if (!nastav() || userIds.length === 0) return 0;

  const db = serviceClient();

  const [volby, odbery] = await Promise.all([
    db.from("notifikace_volby").select("*").in("user_id", userIds),
    db.from("push_odbery").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds),
  ]);

  const podleUzivatele = new Map<string, Volby>();
  for (const v of (volby.data ?? []) as (Volby & { user_id: string })[]) {
    podleUzivatele.set(v.user_id, v);
  }

  const telo = JSON.stringify(z);
  let odeslano = 0;
  const mrtve: number[] = [];

  await Promise.all(
    ((odbery.data ?? []) as {
      id: number; user_id: string; endpoint: string; p256dh: string; auth: string;
    }[]).map(async (o) => {
      const v = podleUzivatele.get(o.user_id) ?? VYCHOZI_VOLBY;
      if (!v[druh]) return;
      if (jeTicho(v.ticho_od, v.ticho_do)) return;

      try {
        await webpush.sendNotification(
          { endpoint: o.endpoint, keys: { p256dh: o.p256dh, auth: o.auth } },
          telo
        );
        odeslano++;
      } catch (err) {
        const stav = (err as { statusCode?: number }).statusCode;
        // 404 a 410 znamenají, že odběr už neexistuje.
        if (stav === 404 || stav === 410) mrtve.push(o.id);
        else log("warn", "push", "odeslání selhalo", { stav });
      }
    })
  );

  if (mrtve.length) await db.from("push_odbery").delete().in("id", mrtve);

  log("info", "push", "notifikace odeslány", { druh, odeslano, uklizeno: mrtve.length });
  return odeslano;
}

/** Všem z týmu kromě toho, kdo akci vyvolal. */
export async function posliTymu(krome: string, druh: Druh, z: Zprava): Promise<number> {
  const db = serviceClient();
  const { data } = await db.from("profiles").select("id").neq("role", "klient").neq("id", krome);
  return posliPush((data ?? []).map((p) => p.id as string), druh, z);
}
