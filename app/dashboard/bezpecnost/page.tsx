import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { jeSprava, type Role } from "@/components/admin/nav";
import { zkratIp, trvani } from "@/lib/bezpecnost/otisk";
import BezpecnostPanel, { type Relace, type Udalost } from "@/components/admin/BezpecnostPanel";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function Bezpecnost() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (!jeSprava(me.role as Role)) redirect("/dashboard");

  let zive: Relace[] = [];
  let udalosti: Udalost[] = [];
  let dnes = 0;
  let neuspechu = 0;
  let chyba = false;

  try {
    const db = serviceClient();
    const pulnoc = new Date(); pulnoc.setHours(0, 0, 0, 0);
    // Relace bez aktivity 30 minut považujeme za skončenou.
    const cerstve = new Date(Date.now() - 30 * 60000).toISOString();

    const [r, u, d, n] = await Promise.all([
      db.from("relace")
        .select("id, user_id, ip, zeme, mesto, vpn, zarizeni, system, prohlizec, pwa, zacatek, posledni, profiles(name)")
        .is("ukoncena_at", null).gte("posledni", cerstve)
        .order("posledni", { ascending: false }).limit(30),
      db.from("bezpecnostni_udalosti")
        .select("id, typ, zavaznost, email, ip, zeme, detail, created_at")
        .order("created_at", { ascending: false }).limit(20),
      db.from("relace").select("id", { count: "exact", head: true }).gte("zacatek", pulnoc.toISOString()),
      db.from("bezpecnostni_udalosti").select("id", { count: "exact", head: true })
        .eq("typ", "neuspech").gte("created_at", pulnoc.toISOString()),
    ]);

    type Radek = {
      id: number; user_id: string; ip: string | null; zeme: string | null; mesto: string | null;
      vpn: boolean; zarizeni: string; system: string; prohlizec: string; pwa: boolean;
      zacatek: string; posledni: string;
      profiles: { name: string } | { name: string }[] | null;
    };

    zive = ((r.data ?? []) as Radek[]).map((x) => {
      const p = Array.isArray(x.profiles) ? x.profiles[0] : x.profiles;
      return {
        id: x.id,
        jmeno: p?.name ?? "Neznámý",
        jaTo: x.user_id === me.id,
        ipZkracena: zkratIp(x.ip),
        misto: [x.mesto, x.zeme].filter(Boolean).join(", ") || "neznámé",
        vpn: x.vpn,
        // Mimo Česko nemusí být problém, ale stojí to za pohled.
        cizina: Boolean(x.zeme && x.zeme !== "CZ"),
        zarizeni: `${x.system} · ${x.prohlizec}${x.pwa ? " · PWA" : ""}`,
        druh: x.zarizeni,
        trvani: trvani(x.zacatek),
      };
    });

    udalosti = ((u.data ?? []) as Record<string, unknown>[]).map((x) => ({
      id: x.id as number,
      typ: x.typ as string,
      zavaznost: x.zavaznost as Udalost["zavaznost"],
      popis: (x.detail as string) ?? (x.email as string) ?? "",
      misto: [(x.zeme as string) ?? null].filter(Boolean).join("") || "—",
      ipZkracena: zkratIp((x.ip as string) ?? null),
      kdy: trvani(x.created_at as string) + " zpět",
    }));

    dnes = d.count ?? 0;
    neuspechu = n.count ?? 0;
  } catch (err) {
    chyba = true;
    log("error", "bezpecnost", "načtení selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const zasah = zive.filter((z) => z.vpn || z.cizina).length + neuspechu;

  return (
    <>
      {chyba ? (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Tabulky bezpečnosti zatím neexistují.</span>{" "}
            <span className="adm-alert__detail">Spusť supabase/bezpecnost.sql.</span>
          </span>
        </div>
      ) : (
        <BezpecnostPanel
          zive={zive}
          udalosti={udalosti}
          dnes={dnes}
          neuspechu={neuspechu}
          zasah={zasah}
        />
      )}
    </>
  );
}
