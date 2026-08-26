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

import { type Rezim } from "./rezimy";

export type { Rezim };

export type Nastroj = {
  klic: string;
  /** Ve kterých režimech je nástroj dostupný. */
  rezimy: Rezim[];
  popis: string;
  /** Parametry, které model smí doplnit. Nic jiného neprojde. */
  parametry?: Record<string, string>;
  /** Kam navigovat, když se odpověď týká konkrétní sekce. */
  sekce?: string;
  /**
   * Riziková akce se neprovede sama — vrátí návrh, který čeká na
   * kliknutí člověka. U operací, které mění, co dostanou klienti,
   * je jeden krok navíc levnější než jedna oprava.
   */
  vyzadujeSchvaleni?: boolean;
  spust: (p: Record<string, string>) => Promise<unknown>;
};

/** Cíl navigace i s filtry, které asistent nastaví. */
export type Navigace = { sekce: string; filtry?: Record<string, string> };

/** Návrh akce ke schválení. Provede ji až člověk. */
export type Navrh = {
  akce: string;
  popis: string;
  duvod: string;
  endpoint: string;
  telo?: Record<string, unknown>;
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
    klic: "prejdi_na_sekci",
    rezimy: ["ask", "search", "build", "operate"] as Rezim[],
    popis: "Přepne do sekce a nastaví filtry. Sekce: prehled, klienti, kontakty, analytika, motor, automatizace, ukoly, audit, nastaveni.",
    parametry: {
      sekce: "klíč sekce",
      hledat: "text do vyhledávání (nepovinné)",
      obor: "filtr oboru u kontaktů (nepovinné)",
      mesto: "filtr města u kontaktů (nepovinné)",
    },
    spust: async (p) => {
      const CESTY: Record<string, string> = {
        prehled: "/dashboard",
        klienti: "/dashboard/klienti",
        kontakty: "/dashboard/kontakty",
        analytika: "/dashboard/analytika",
        motor: "/dashboard/motor",
        automatizace: "/dashboard/automatizace",
        ukoly: "/dashboard/ukoly",
        audit: "/dashboard/audit",
        nastaveni: "/dashboard/nastaveni",
      };
      const cesta = CESTY[p.sekce ?? ""];
      if (!cesta) return { chyba: `Sekce "${p.sekce}" neexistuje.`, dostupne: Object.keys(CESTY) };

      const filtry: Record<string, string> = {};
      if (p.hledat) filtry.q = p.hledat;
      if (p.obor) filtry.obor = p.obor;
      if (p.mesto) filtry.mesto = p.mesto;

      return { navigace: { sekce: cesta, filtry }, popis: `Přepínám do sekce ${p.sekce}.` };
    },
  },

  {
    klic: "prehled_provozu",
    rezimy: ["ask", "search"] as Rezim[],
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
    rezimy: ["ask", "search"] as Rezim[],
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
    rezimy: ["ask", "search"] as Rezim[],
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
    rezimy: ["ask", "search"] as Rezim[],
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
    rezimy: ["ask", "search"] as Rezim[],
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
    rezimy: ["ask", "search", "operate"] as Rezim[],
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
    rezimy: ["ask", "search"] as Rezim[],
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

NASTROJE.push(
  {
    klic: "overit_v_ares",
    rezimy: ["search"] as Rezim[],
    popis: "Ověří firmu ve veřejném rejstříku ARES podle IČO nebo názvu. Vrací data z webu, ne z naší databáze.",
    parametry: { ico: "IČO firmy", nazev: "název firmy (když IČO neznáš)" },
    spust: async (p) => {
      // ARES má veřejné API zdarma. Odpověď se označí jako webová,
      // aby v rozhraní nesplynula s našimi daty.
      try {
        if (p.ico) {
          const res = await fetch(
            `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${encodeURIComponent(p.ico)}`,
            { headers: { Accept: "application/json" } }
          );
          if (res.status === 404) return { zdroj: "web", nalezeno: false, hledano: p.ico };
          if (!res.ok) return { zdroj: "web", chyba: `ARES odpověděl ${res.status}` };

          const d = await res.json();
          return {
            zdroj: "web",
            nalezeno: true,
            nazev: d?.obchodniJmeno ?? null,
            ico: d?.ico ?? null,
            pravniForma: d?.pravniForma ?? null,
            sidlo: d?.sidlo?.textovaAdresa ?? null,
            vznik: d?.datumVzniku ?? null,
            zanik: d?.datumZaniku ?? null,
            aktivni: !d?.datumZaniku,
          };
        }

        if (p.nazev) {
          const res = await fetch(
            "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat",
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ obchodniJmeno: p.nazev, pocet: 5 }),
            }
          );
          if (!res.ok) return { zdroj: "web", chyba: `ARES odpověděl ${res.status}` };

          const d = await res.json();
          const firmy = (d?.ekonomickeSubjekty ?? []).map((f: Record<string, unknown>) => ({
            nazev: f.obchodniJmeno,
            ico: f.ico,
            sidlo: (f.sidlo as { textovaAdresa?: string })?.textovaAdresa ?? null,
            aktivni: !f.datumZaniku,
          }));
          return { zdroj: "web", nalezeno: firmy.length, firmy };
        }

        return { chyba: "Zadej IČO nebo název firmy." };
      } catch (err) {
        return { zdroj: "web", chyba: `ARES nedostupný: ${String(err).slice(0, 120)}` };
      }
    },
  },
  {
    klic: "navrhni_akci",
    rezimy: ["operate"] as Rezim[],
    popis: "Připraví rizikovou akci ke schválení člověkem. Akce: pozastavit_rozesilani, spustit_sken, zucastnit_zuctovani.",
    parametry: { akce: "klíč akce", duvod: "proč to navrhuješ" },
    vyzadujeSchvaleni: true,
    spust: async (p) => {
      const AKCE: Record<string, { popis: string; endpoint: string; telo?: Record<string, unknown> }> = {
        pozastavit_rozesilani: {
          popis: "Pozastavit automatické rozesílání",
          endpoint: "/api/settings",
          telo: { automations_paused: true },
        },
        spustit_sken: {
          popis: "Spustit hledání hodnoty",
          endpoint: "/api/engine/run",
        },
        zucastnit_zuctovani: {
          popis: "Spustit zúčtování nasucho",
          endpoint: "/api/engine/settle?dry=1",
        },
      };

      const a = AKCE[p.akce ?? ""];
      if (!a) return { chyba: `Akce "${p.akce}" neexistuje.`, dostupne: Object.keys(AKCE) };

      return {
        navrh: {
          akce: p.akce,
          popis: a.popis,
          duvod: p.duvod ?? "Bez uvedeného důvodu.",
          endpoint: a.endpoint,
          telo: a.telo,
        },
      };
    },
  }
);

NASTROJE.push(
  {
    klic: "otevri_klienta",
    rezimy: ["ask", "search", "build", "operate"] as Rezim[],
    popis: "Otevře detail konkrétního klienta podle jména. Přepne do sekce i s filtrem.",
    parametry: { jmeno: "část jména klienta" },
    spust: async (p) => {
      if (!p.jmeno) return { chyba: "Chybí jméno." };
      const db = serviceClient();
      const { data } = await db
        .from("profiles").select("name").eq("role", "klient")
        .ilike("name", `%${p.jmeno}%`).limit(3);

      const nalezeni = (data ?? []) as { name: string }[];
      if (nalezeni.length === 0) return { nalezeno: false, hledano: p.jmeno };
      // Víc shod znamená zeptat se, ne hádat.
      if (nalezeni.length > 1) return { vice: nalezeni.map((n) => n.name) };

      return {
        navigace: { sekce: "/dashboard/klienti", filtry: { q: nalezeni[0].name } },
        popis: `Otevírám ${nalezeni[0].name}.`,
      };
    },
  },
  {
    klic: "nastav_obdobi",
    rezimy: ["ask", "search"] as Rezim[],
    popis: "Přepne analytiku na jiné období: 7d, 30d, 90d nebo all.",
    parametry: { obdobi: "7d | 30d | 90d | all" },
    spust: async (p) => {
      const platne = ["7d", "30d", "90d", "all"];
      if (!platne.includes(p.obdobi ?? "")) {
        return { chyba: `Období "${p.obdobi}" neexistuje.`, dostupne: platne };
      }
      return {
        navigace: { sekce: "/dashboard/analytika", filtry: { obdobi: p.obdobi } },
        popis: `Přepínám na ${p.obdobi}.`,
      };
    },
  },
  {
    klic: "zalozi_ukol",
    rezimy: ["build"] as Rezim[],
    popis: "Založí úkol s termínem a prioritou. Volitelně navázaný na klienta.",
    parametry: {
      nazev: "co se má udělat",
      termin: "datum ve tvaru RRRR-MM-DD (nepovinné)",
      priorita: "nizka | bezna | vysoka",
      klient: "jméno klienta (nepovinné)",
    },
    spust: async (p) => {
      if (!p.nazev) return { chyba: "Chybí název úkolu." };
      const db = serviceClient();

      let klientId: string | null = null;
      if (p.klient) {
        const { data } = await db
          .from("profiles").select("id").eq("role", "klient")
          .ilike("name", `%${p.klient}%`).limit(1).maybeSingle<{ id: string }>();
        klientId = data?.id ?? null;
      }

      const { data, error } = await db.from("ukoly").insert({
        nazev: p.nazev,
        termin: p.termin || null,
        priorita: ["nizka", "bezna", "vysoka"].includes(p.priorita ?? "") ? p.priorita : "bezna",
        klient_id: klientId,
        zdroj: "asistent",
      }).select("id, nazev, termin, priorita").single();

      if (error) return { chyba: `Úkol se nepodařilo založit: ${error.message}` };
      return { zalozeno: true, ukol: data };
    },
  },
  {
    klic: "pridej_poznamku",
    rezimy: ["build"] as Rezim[],
    popis: "Přidá poznámku ke klientovi. Připojí ji k té stávající, nepřepíše ji.",
    parametry: { jmeno: "jméno klienta", text: "text poznámky" },
    spust: async (p) => {
      if (!p.jmeno || !p.text) return { chyba: "Chybí jméno nebo text." };
      const db = serviceClient();

      const { data } = await db
        .from("profiles").select("id, name, poznamka").eq("role", "klient")
        .ilike("name", `%${p.jmeno}%`).limit(1)
        .maybeSingle<{ id: string; name: string; poznamka: string | null }>();

      if (!data) return { nalezeno: false, hledano: p.jmeno };

      // Přepsání by zahodilo, co tam napsal někdo jiný.
      const datum = new Date().toLocaleDateString("cs-CZ");
      const nova = data.poznamka ? `${data.poznamka}\n\n[${datum}] ${p.text}` : `[${datum}] ${p.text}`;

      const { error } = await db.from("profiles").update({ poznamka: nova }).eq("id", data.id);
      if (error) return { chyba: error.message };
      return { pridano: true, klient: data.name };
    },
  },
  {
    klic: "otevrene_ukoly",
    rezimy: ["ask", "build"] as Rezim[],
    popis: "Vypíše nesplněné úkoly seřazené podle termínu.",
    sekce: "/dashboard/ukoly",
    spust: async () => {
      const db = serviceClient();
      const { data } = await db
        .from("ukoly").select("nazev, termin, priorita, created_at")
        .eq("hotovo", false).order("termin", { ascending: true, nullsFirst: false }).limit(20);
      return { pocet: (data ?? []).length, ukoly: data ?? [] };
    },
  },
  {
    klic: "hledej_vsude",
    rezimy: ["ask", "search"] as Rezim[],
    popis: "Prohledá klienty, kontakty i úkoly jedním dotazem.",
    parametry: { dotaz: "hledaný text" },
    spust: async (p) => {
      if (!p.dotaz) return { chyba: "Chybí dotaz." };
      const db = serviceClient();
      const q = `%${p.dotaz}%`;

      const [k, f, u] = await Promise.all([
        db.from("profiles").select("name, plan").eq("role", "klient").ilike("name", q).limit(5),
        db.from("kontakty").select("company_name, ico, city").or(`company_name.ilike.${q},ico.ilike.${q}`).limit(5),
        db.from("ukoly").select("nazev, termin").ilike("nazev", q).eq("hotovo", false).limit(5),
      ]);

      return {
        klienti: k.data ?? [],
        kontakty: f.data ?? [],
        ukoly: u.data ?? [],
        celkem: (k.data?.length ?? 0) + (f.data?.length ?? 0) + (u.data?.length ?? 0),
      };
    },
  },
  {
    klic: "posledni_zmeny",
    rezimy: ["ask", "operate"] as Rezim[],
    popis: "Co se v systému naposled změnilo — kdo, co a kdy.",
    sekce: "/dashboard/audit",
    parametry: { pocet: "kolik záznamů (výchozí 10)" },
    spust: async (p) => {
      const db = serviceClient();
      const limit = Math.min(30, Math.max(1, Number(p.pocet) || 10));
      const { data } = await db
        .from("audit_log").select("action, entity, entity_id, source, reason, created_at")
        .order("created_at", { ascending: false }).limit(limit);
      return { zmeny: data ?? [] };
    },
  },
  {
    klic: "schval_kandidata",
    rezimy: ["operate"] as Rezim[],
    popis: "Připraví schválení nebo zamítnutí kandidáta ke kliknutí člověkem.",
    parametry: { udalost: "název zápasu", rozhodnuti: "approved | rejected" },
    vyzadujeSchvaleni: true,
    spust: async (p) => {
      const db = serviceClient();
      const { data } = await db
        .from("candidates").select("id, event_name, market, selection, offered_odds, ev")
        .eq("status", "pending").ilike("event_name", `%${p.udalost ?? ""}%`).limit(1)
        .maybeSingle<Record<string, unknown>>();

      if (!data) return { nalezeno: false, hledano: p.udalost };
      const rozhodnuti = p.rozhodnuti === "rejected" ? "rejected" : "approved";

      return {
        navrh: {
          akce: "schvalit_kandidata",
          popis: `${rozhodnuti === "approved" ? "Schválit" : "Zamítnout"}: ${data.event_name} — ${data.selection} @ ${data.offered_odds}`,
          duvod: `Hodnota ${((Number(data.ev)) * 100).toFixed(1)} %.`,
          endpoint: "/api/candidates/approve",
          telo: { candidateId: data.id, decision: rozhodnuti },
        },
      };
    },
  }
);

export const najdiNastroj = (klic: string) => NASTROJE.find((n) => n.klic === klic);

/** Seznam pro model — jen nástroje povolené v daném režimu. */
export const katalog = (rezim: Rezim) =>
  NASTROJE
    .filter((n) => n.rezimy.includes(rezim))
    .map((n) => ({ klic: n.klic, popis: n.popis, parametry: n.parametry ?? {} }));

/** Kolik nástrojů má režim k dispozici. Pro rozhraní. */
export const pocetVRezimu = (rezim: Rezim) =>
  NASTROJE.filter((n) => n.rezimy.includes(rezim)).length;
