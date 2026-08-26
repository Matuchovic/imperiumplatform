import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { BANDS, type BandKey } from "@/lib/engine/bands";
import { PageTitle } from "@/components/admin/PageTitle";
import BandCard from "@/components/admin/BandCard";
import ScanButton from "@/components/admin/ScanButton";
import type { Candidate } from "@/lib/engine/types";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  event_name: string;
  market: string;
  selection: string;
  offered_odds: number;
  threshold_odds: number;
  ev: number;
  units: number;
  band: string | null;
  created_at: string;
};

export default async function Tipy() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (me.role === "client") redirect("/dashboard");

  // Čte se z databáze, ne z živého skenu. Každý průchod stojí kvótu
  // u poskytovatele a otevření stránky ji nesmí utrácet.
  let rows: Row[] = [];
  let lastRun: string | null = null;

  try {
    const db = serviceClient();
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const { data } = await db
      .from("candidates")
      .select("id, event_name, market, selection, offered_odds, threshold_odds, ev, units, band, created_at")
      .gte("created_at", since)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(60);

    rows = (data ?? []) as Row[];

    const { data: run } = await db
      .from("engine_runs")
      .select("started_at")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ started_at: string }>();

    lastRun = run?.started_at ?? null;
  } catch (err) {
    console.error("[tipy]", err);
  }

  const asCandidate = (r: Row): Candidate => ({
    id: r.id,
    matchId: r.id,
    sport: "",
    event: r.event_name,
    market: r.market,
    selection: r.selection,
    sharpOdds: 0,
    fairProb: 0,
    offeredOdds: Number(r.offered_odds),
    offeredBy: "",
    ev: Number(r.ev),
    thresholdOdds: Number(r.threshold_odds),
    units: Number(r.units),
    commenceTime: r.created_at,
  });

  const groups = BANDS.map((band) => ({
    band,
    items: rows.filter((r) => (r.band as BandKey) === band.key).map(asCandidate),
  }));

  const total = groups.reduce((s, g) => s + g.items.length, 0);
  const ago = lastRun
    ? Math.round((Date.now() - new Date(lastRun).getTime()) / 60000)
    : null;

  return (
    <>
      <PageTitle
        title="Nálezy podle pásma"
        lead="Hledání se spouští tlačítkem. Každý průchod stojí kvótu u poskytovatele kurzů, takže neběží na pozadí ani při otevření stránky."
      />

      <ScanButton />

      <p className="scan-last">
        {ago === null
          ? "Zatím neproběhlo žádné hledání."
          : ago < 1
          ? "Poslední hledání právě teď."
          : `Poslední hledání před ${ago} min. Zobrazeny nálezy za posledních 12 hodin.`}
      </p>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))",
          marginTop: 16,
        }}
      >
        {groups.map(({ band, items }) => (
          <BandCard key={band.key} band={band} items={items} />
        ))}
      </div>

      {total > 0 && (
        <div className="adm-actions">
          <button className="adm-btn adm-btn--primary">Schválit a rozeslat {total}</button>
          <button className="adm-btn">Zobrazit výpočet</button>
        </div>
      )}
    </>
  );
}
