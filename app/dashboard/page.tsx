import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { performance, confidenceNote, type SettledTicket } from "@/lib/stats/performance";
import { PageTitle } from "@/components/admin/PageTitle";
import { Stat, Panel, Row } from "@/components/admin/ui";
import { log } from "@/lib/log";
import Kalendare from "@/components/kalendar/Kalendare";
import Poznamky from "@/components/kalendar/Poznamky";

export const dynamic = "force-dynamic";

/**
 * Přehled ze skutečné databáze. Když data nejsou, ukáže se prázdný
 * stav — ne ukázková čísla.
 */
export default async function Prehled() {
  const me = await roleOf();
  if (!me) redirect("/login");

  let name = "";
  let tickets: SettledTicket[] = [];
  let openCount = 0;
  let balance = 0;
  let clients = 0;
  let candidates = 0;
  let lastRun: string | null = null;
  let failed = false;

  try {
    const db = serviceClient();
    const staff = me.role !== "klient";

    const { data: profile } = await db
      .from("profiles").select("name").eq("id", me.id).maybeSingle<{ name: string }>();
    name = profile?.name ?? "";

    // Klient vidí své, tým celý provoz.
    let tq = db.from("tickets").select("stake, profit, odds, clv, state");
    if (!staff) tq = tq.eq("user_id", me.id);
    const { data: tRows } = await tq.limit(2000);

    const all = (tRows ?? []) as { stake: number; profit: number; odds: number; clv: number | null; state: string }[];
    openCount = all.filter((t) => t.state === "open").length;
    tickets = all
      .filter((t) => t.state !== "open")
      .map((t) => ({ stake: Number(t.stake), profit: Number(t.profit), odds: Number(t.odds), clv: t.clv }));

    const { data: bal } = await db.rpc("bankroll_balance", { uid: me.id });
    balance = Number(bal ?? 0);

    if (staff) {
      const { count: c } = await db
        .from("profiles").select("id", { count: "exact", head: true }).eq("role", "klient");
      clients = c ?? 0;

      const { count: cc } = await db
        .from("candidates").select("id", { count: "exact", head: true }).eq("status", "pending");
      candidates = cc ?? 0;

      const { data: run } = await db
        .from("engine_runs").select("started_at")
        .order("started_at", { ascending: false }).limit(1)
        .maybeSingle<{ started_at: string }>();
      lastRun = run?.started_at ?? null;
    }
  } catch (err) {
    failed = true;
    log("error", "prehled", "načtení přehledu selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const perf = performance(tickets);
  const staff = me.role !== "klient";
  const first = name.split(" ")[0];
  const ago = lastRun ? Math.round((Date.now() - new Date(lastRun).getTime()) / 60000) : null;

  return (
    <>
      <PageTitle
        title={first ? `Vítej zpět, ${first}` : "Přehled"}
        lead={
          perf.count === 0 && openCount === 0
            ? "Zatím tu nejsou žádná data. Objeví se, jakmile projde první tiket."
            : confidenceNote(perf)
        }
      />

      {failed && (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Načtení dat selhalo.</span>{" "}
            <span className="adm-alert__detail">Zkus stránku načíst znovu.</span>
          </span>
        </div>
      )}

      <div className="adm-cards">
        <Stat
          label={staff ? "Bankroll (tvůj)" : "Bankroll"}
          value={balance.toLocaleString("cs-CZ")}
          unit="Kč"
          note="součet účetní knihy"
        />
        <Stat label="Vyhodnocené tikety" value={String(perf.count)} note={`${openCount} otevřených`} />
        <Stat
          label="CLV"
          value={perf.avgClv === null ? "—" : `${perf.avgClv > 0 ? "+" : ""}${perf.avgClv}`}
          unit={perf.avgClv === null ? undefined : "%"}
          note={perf.clvCount ? `z ${perf.clvCount} tiketů` : "zatím bez uzavíracích kurzů"}
          tone={perf.avgClv !== null && perf.avgClv > 0 ? "good" : "neutral"}
        />
        <Stat
          label="ROI"
          value={perf.count ? `${perf.roi > 0 ? "+" : ""}${perf.roi}` : "—"}
          unit={perf.count ? "%" : undefined}
          note={perf.roiInterval ? `${perf.roiInterval[0]} až ${perf.roiInterval[1]}` : "vzorek je malý"}
          tone={perf.proven ? "good" : "warn"}
        />
      </div>

      {perf.count > 0 && (
        <Panel title="Výsledky" lead={confidenceNote(perf)}>
          <div style={{ marginTop: 10 }}>
            <Row label="Výhry" value={String(perf.won)} tone="good" />
            <Row label="Prohry" value={String(perf.lost)} />
            <Row label="Zrušené" value={String(perf.void)} />
            <Row label="Úspěšnost" value={`${perf.winRate} %`} meta={`průměrný kurz ${perf.avgOdds}`} />
            <Row
              label="Zisk"
              value={`${perf.profit > 0 ? "+" : ""}${perf.profit.toLocaleString("cs-CZ")} Kč`}
              tone={perf.profit >= 0 ? "good" : "bad"}
              meta={`vsazeno ${perf.staked.toLocaleString("cs-CZ")} Kč`}
            />
          </div>
        </Panel>
      )}

      {staff && (
        <>
          <div style={{ marginTop: 20 }}>
            <Kalendare jaId={me.id} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Poznamky jaId={me.id} />
          </div>
        </>
      )}

      {staff && (
        <Panel title="Provoz">
          <div style={{ marginTop: 10 }}>
            <Row label="Klientů" value={String(clients)} />
            <Row label="Kandidátů ke schválení" value={String(candidates)} tone={candidates > 0 ? "warn" : "neutral"} />
            <Row
              label="Poslední hledání"
              value={ago === null ? "neproběhlo" : ago < 1 ? "právě teď" : `před ${ago} min`}
            />
          </div>
        </Panel>
      )}
    </>
  );
}
