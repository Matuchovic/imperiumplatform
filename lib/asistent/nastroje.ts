import { serviceClient } from "@/lib/supabase/server";
import { performance, confidenceNote, type SettledTicket } from "@/lib/stats/performance";
import { BANDS } from "@/lib/engine/bands";

/**
 * Nástroje asistenta.
 *
 * Každý je hotový dotaz do databáze. Model si vybírá, který zavolat,
 * a výsledek jen převypráví — čísla nepočítá.
 *
 * Bez tohohle omezení by na otázku „kolik mám klientů" odpověděl
 * se stejnou jistotou správně i špatně a nikdo by nepoznal rozdíl.
 */

export type Nastroj = {
  klic: string;
  popis: string;
  /** Parametry, které model smí doplnit. Nic jiného neprojde. */
  parametry?: Record<string, string>;
  /** Kam navigovat, když se odpověď týká konkrétní sekce. */
  sekce?: string;
  spust: (p: Record<string, string>) => Promise<unknown>;
};

const OBDOBI: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, all: 3650 };
const odKdy = (klic: string) =>
  new Date(Date.now() - (OBDOBI[klic] ?? 30) * 864e5).toISOString();

async function tikety(od: string, userId?: string): Promise<SettledTicket[]> {
  const db = serviceClient();
  let q = db.from("tickets").select("stake, profit, odds, clv, state").neq("state", "open").gte("placed_at", od);
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q.limit(3000);
  return (data ?? []).map((t) => ({
    stake: Number(t.stake), profit: Number(t.profit),
    odds: Number(t.odds), clv: t.clv === null ? null : Number(t.clv),
  }));
}

export const NASTROJE: Nastroj[] = [
  {
    klic: "prehled_provozu",
    popis: "Kolik je klientů, kolik kandidátů čeká na schválení, kdy naposled běžel motor.",
    sekce: "/dashboard",
    spust: async () => {
      const db = serviceClient();
      const [k, c, o, r] = await Promise.all([
        db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "klient"),
        db.from("candidates").select("id", { count: "exact", head: true }).eq("status", "pending"),
        db.from("tickets").select("id", { count: "exact", head: true }).eq("state", "open"),
        db.from("engine_runs").select("started_at").order("started_at", { ascending: false }).limit(1).maybeSingle<{ started_at: string }>(),
      ]);
      const min = r.data ? Math.round((Date.now() - new Date(r.data.started_at).getTime()) / 60000) : null;
      return {
        klientu: k.count ?? 0,
        kandidatu_ceka: c.count ?? 0,
        otevrenych_tiketu: o.count ?? 0,
        posledni_sken_pred_minutami: min,
      };
    },
  },
  {
    klic: "vykonnost",
    popis: "CLV, ROI s intervalem spolehlivosti a velikost vzorku za období.",
    parametry: { obdobi: "7d | 30d | 90d | all" },
    sekce: "/dashboard/analytika",
    spust: async (p) => {
      const perf = performance(await tikety(odKdy(p.obdobi ?? "30d")));
      return {
        obdobi: p.obdobi ?? "30d",
        vyhodnocenych_tiketu: perf.count,
        clv_procent: perf.avgClv,
        roi_procent: perf.roi,
        interval_roi: perf.roiInterval,
        uspesnost_procent: perf.winRate,
        prumerny_kurz: perf.avgOdds,
        zisk_odlisitelny_od_nahody: perf.proven,
        poznamka: confidenceNote(perf),
      };
    },
  },
  {
    klic: "klienti_k_reseni",
    popis: "Kdo potřebuje pozornost: noví v propadu, kdo sází mimo plán, kdo dosáhl cíle.",
    sekce: "/dashboard/klienti",
    spust: async () => {
      const db = serviceClient();
      const { data } = await db
        .from("profiles")
        .select("id, name, bankroll, goal, created_at")
        .eq("role", "klient")
        .limit(200);

      const ven: { jmeno: string; duvod: string; hodnota: string }[] = [];
      for (const p of (data ?? []) as { id: string; name: string; bankroll: number; goal: number; created_at: string }[]) {
        const dni = Math.round((Date.now() - new Date(p.created_at).getTime()) / 864e5);
        const { data: bal } = await db.rpc("bankroll_balance", { uid: p.id });
        const zustatek = Number(bal ?? p.bankroll);
        const zmena = p.bankroll > 0 ? ((zustatek - p.bankroll) / p.bankroll) * 100 : 0;

        // Nováčci nemají naspořený polštář a odcházejí první.
        if (dni < 45 && zmena < -5) {
          ven.push({ jmeno: p.name, duvod: "nový a v propadu", hodnota: `${dni} dní, ${zmena.toFixed(1)} %` });
        } else if (p.goal > 0 && zustatek >= p.goal) {
          ven.push({ jmeno: p.name, duvod: "dosáhl cíle", hodnota: `${Math.round(zustatek)} Kč` });
        }
      }
      return { pocet: ven.length, klienti: ven.slice(0, 8) };
    },
  },
  {
    klic: "klient_detail",
    popis: "Profil jednoho klienta: bankroll, tikety, CLV, stáří účtu. Hledá podle jména.",
    parametry: { jmeno: "část jména klienta" },
    sekce: "/dashboard/klienti",
    spust: async (p) => {
      if (!p.jmeno) return { chyba: "Chybí jméno." };
      const db = serviceClient();
      const { data } = await db
        .from("profiles")
        .select("id, name, plan, bankroll, goal, unit_pct, subscribed_bands, telegram_chat_id, created_at")
        .eq("role", "klient").ilike("name", `%${p.jmeno}%`).limit(1)
        .maybeSingle<Record<string, unknown>>();

      if (!data) return { nalezen: false, hledano: p.jmeno };

      const id = data.id as string;
      const { data: bal } = await db.rpc("bankroll_balance", { uid: id });
      const perf = performance(await tikety(odKdy("90d"), id));
      const dni = Math.round((Date.now() - new Date(data.created_at as string).getTime()) / 864e5);

      return {
        nalezen: true,
        jmeno: data.name,
        plan: data.plan,
        klientem_dni: dni,
        pocatecni_vklad: Number(data.bankroll),
        zustatek: Number(bal ?? 0),
        cil: Number(data.goal ?? 0),
        pasma: data.subscribed_bands,
        telegram: Boolean(data.telegram_chat_id),
        tiketu_90d: perf.count,
        clv_procent: perf.avgClv,
        roi_procent: perf.roi,
        poznamka: confidenceNote(perf),
      };
    },
  },
  {
    klic: "rozpad_pasem",
    popis: "Jak si vede které pásmo kurzů a co se od něj dá čekat.",
    sekce: "/dashboard/analytika",
    spust: async () => {
      const db = serviceClient();
      const { data } = await db
        .from("tickets").select("band, stake, profit, odds, clv, state")
        .neq("state", "open").limit(3000);

      const rows = (data ?? []) as { band: string; stake: number; profit: number; odds: number; clv: number | null }[];
      return BANDS.map((b) => {
        const mine = rows.filter((r) => r.band === b.key);
        const perf = performance(mine.map((r) => ({
          stake: Number(r.stake), profit: Number(r.profit),
          odds: Number(r.odds), clv: r.clv === null ? null : Number(r.clv),
        })));
        return {
          pasmo: b.label,
          kurzy: `${b.min}–${b.max === Infinity ? "∞" : b.max}`,
          tiketu: perf.count,
          clv_procent: perf.avgClv,
          roi_procent: perf.roi,
          ocekavana_uspesnost: `${b.hitRate[0]}–${b.hitRate[1]} %`,
          na_prukaz_potreba_tiketu: b.proofN,
        };
      });
    },
  },
  {
    klic: "stav_systemu",
    popis: "Poslední sken motoru, kolik našel, jestli něco vypadá špatně.",
    sekce: "/dashboard/motor",
    spust: async () => {
      const db = serviceClient();
      const { data } = await db
        .from("engine_runs").select("started_at, scanned, found, awaiting")
        .order("started_at", { ascending: false }).limit(5);
      return { behy: data ?? [] };
    },
  },
  {
    klic: "hledat_kontakt",
    popis: "Najde firmu v databázi kontaktů podle názvu nebo IČO.",
    parametry: { dotaz: "název firmy nebo IČO" },
    sekce: "/dashboard/kontakty",
    spust: async (p) => {
      if (!p.dotaz) return { chyba: "Chybí dotaz." };
      const db = serviceClient();
      const { data } = await db
        .from("kontakty").select("company_name, ico, industry, city, website, ucel")
        .or(`company_name.ilike.%${p.dotaz}%,ico.ilike.%${p.dotaz}%`).limit(5);
      return { nalezeno: (data ?? []).length, firmy: data ?? [] };
    },
  },
];

export const najdiNastroj = (klic: string) => NASTROJE.find((n) => n.klic === klic);

/** Seznam pro model. Jen klíč, popis a povolené parametry. */
export const katalog = () =>
  NASTROJE.map((n) => ({ klic: n.klic, popis: n.popis, parametry: n.parametry ?? {} }));
