import { ACCOUNT, goalPct, ticketsToGoal, unitSize } from "@/lib/data";
import { Card, Disclaimer, PageHeader } from "@/components/dashboard/ui";

const GOALS = [10_000, 25_000, 50_000, 100_000, 200_000];

export default function Plan() {
  const pct = goalPct();
  const remaining = ACCOUNT.goal - ACCOUNT.bankroll;
  const tickets = ticketsToGoal();
  const months = Math.round(tickets / 4 / 30);

  return (
    <>
      <PageHeader eyebrow="Nastavení plánu" title="Můj plán" />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <p className="eyebrow">Cílová částka</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {GOALS.map((g) => {
              const active = g === ACCOUNT.goal;
              return (
                <span
                  key={g}
                  className="data rounded-lg px-3 py-2 text-[13px]"
                  style={
                    active
                      ? { color: "#04140a", background: "#7ef0a8", border: "1px solid #7ef0a8" }
                      : { color: "#8fa396", border: "1px solid rgba(126,240,168,0.14)" }
                  }
                >
                  {g / 1000}K
                </span>
              );
            })}
          </div>

          <p className="eyebrow mt-6">Velikost jednotky</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { l: "Opatrně", v: 1 },
              { l: "Vyváženě", v: 2 },
              { l: "Ostře", v: 3.5 },
            ].map((r) => {
              const active = r.v === ACCOUNT.unitPct;
              return (
                <div
                  key={r.l}
                  className="rounded-lg py-2.5 text-center"
                  style={
                    active
                      ? { border: "1px solid rgba(126,240,168,0.55)", background: "rgba(126,240,168,0.09)" }
                      : { border: "1px solid rgba(126,240,168,0.14)" }
                  }
                >
                  <p className="text-[12px]" style={{ color: active ? "#ecfdf2" : "#8fa396" }}>{r.l}</p>
                  <p className="data mt-0.5 text-[12px]" style={{ color: active ? "#7ef0a8" : "#5b6c61" }}>
                    {r.v.toString().replace(".", ",")} %
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <p className="eyebrow" style={{ color: "#7ef0a8" }}>Co to znamená</p>

          {[
            ["Jednotka sázky", `${unitSize().toLocaleString("cs-CZ")} Kč`],
            ["Zbývá vydělat", `${remaining.toLocaleString("cs-CZ")} Kč`],
            ["Odhad tiketů", `~${tickets}`],
            ["Horizont", `${months}–${months + 3} měsíců`],
          ].map(([k, v], i) => (
            <div
              key={k}
              className="flex items-baseline justify-between py-2.5"
              style={i > 0 ? { borderTop: "1px solid rgba(126,240,168,0.09)" } : undefined}
            >
              <span className="text-[13px] text-ash">{k}</span>
              <span className="data text-[14px] text-chalk">{v}</span>
            </div>
          ))}
          <div className="flex items-baseline justify-between py-2.5" style={{ borderTop: "1px solid rgba(126,240,168,0.09)" }}>
            <span className="text-[13px] text-ash">Počítej s propadem</span>
            <span className="data text-[14px]" style={{ color: "#ffc94a" }}>−20 až −30 %</span>
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-ash-2">
            Odhad vychází z tvého dosavadního yieldu {ACCOUNT.yield.toString().replace(".", ",")} %.
            Je to výhled, ne slib — období může skončit ztrátou.
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">Postup k cíli</p>
          <p className="data text-[12px] text-signal">{pct} %</p>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg,#16a34a,#7ef0a8 60%,#5eead4)",
              boxShadow: "0 0 16px rgba(126,240,168,0.55)",
            }}
          />
        </div>
        <p className="data mt-2.5 text-[12px] text-ash">
          {ACCOUNT.bankroll.toLocaleString("cs-CZ")} z {ACCOUNT.goal.toLocaleString("cs-CZ")} Kč
        </p>
      </Card>

      <Disclaimer />
    </>
  );
}
