import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ACCOUNT, EQUITY, TICKETS, goalPct, unitSize } from "@/lib/data";
import { Card, Disclaimer, PageHeader, Sparkline, Stat, StateBadge } from "@/components/dashboard/ui";

export default async function Prehled() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, plan")
    .eq("id", user?.id ?? "")
    .maybeSingle<{ name: string | null; plan: string | null }>();
  const pct = goalPct();

  return (
    <>
      <PageHeader eyebrow="Přehled" title={`Vítej zpět, ${(profile?.name ?? "").split(" ")[0]}`} />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Bankroll" value="34 200" unit="Kč" delta="+16 200 Kč za 30 dní" />
        <Stat label="ROI" value="+12,4" unit="%" delta="+3,1 p. b. za 30 dní" />
        <Stat label="Úspěšnost" value="61,8" unit="%" delta="−1,2 p. b. za 30 dní" positive={false} />
        <Stat label="Jednotka sázky" value={unitSize().toLocaleString("cs-CZ")} unit="Kč" delta={`${ACCOUNT.unitPct} % z bankrollu`} />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <p className="eyebrow">Vývoj bankrollu · 30 dní</p>
            <p className="data text-[12px] text-signal">+90,0 %</p>
          </div>
          <Sparkline points={EQUITY} />
        </Card>

        <Card className="p-5">
          <p className="eyebrow">Cíl plánu</p>
          <p className="data mt-2.5 text-[28px] font-semibold leading-none text-chalk">
            34 200 <span className="text-[15px] font-normal text-ash-2">/ 50 000 Kč</span>
          </p>
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg,#16a34a,#7ef0a8 60%,#5eead4)",
                boxShadow: "0 0 16px rgba(126,240,168,0.55)",
              }}
            />
          </div>
          <p className="data mt-2.5 text-[12px] text-ash">{pct} % splněno · zbývá 15 800 Kč</p>
          <Link href="/dashboard/plan" className="mt-4 inline-block text-[13px] text-signal hover:underline">
            Zobrazit plán
          </Link>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="eyebrow">Poslední tikety</p>
          <Link href="/dashboard/tikety" className="text-[13px] text-signal hover:underline">
            Zobrazit vše
          </Link>
        </div>
        <div className="scroll-x">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr style={{ borderTop: "1px solid rgba(126,240,168,0.08)" }}>
                {["Tiket", "Zápas", "Sázka", "Kurz", "Jednotky", "Stav"].map((h) => (
                  <th key={h} className="eyebrow px-5 py-3 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TICKETS.slice(0, 5).map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid rgba(126,240,168,0.06)" }}>
                  <td className="data px-5 py-3.5 text-[13px] text-ash-2">{t.id}</td>
                  <td className="px-5 py-3.5 text-[14px] text-chalk">{t.event}</td>
                  <td className="px-5 py-3.5 text-[13.5px] text-ash">{t.market}</td>
                  <td className="data px-5 py-3.5 text-[13.5px] text-chalk">{t.odds.toFixed(2)}</td>
                  <td className="data px-5 py-3.5 text-[13.5px] text-ash">{t.units.toFixed(1)}</td>
                  <td className="px-5 py-3.5"><StateBadge state={t.state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Disclaimer />
    </>
  );
}
