import { ACCOUNT, EQUITY, MOVEMENTS, unitSize } from "@/lib/data";
import { Card, Disclaimer, PageHeader, Sparkline, Stat } from "@/components/dashboard/ui";

export default function Bankroll() {
  const deposited = MOVEMENTS.filter((m) => m.amount > 0).reduce((s, m) => s + m.amount, 0);
  const withdrawn = -MOVEMENTS.filter((m) => m.amount < 0).reduce((s, m) => s + m.amount, 0);
  const net = ACCOUNT.bankroll - deposited + withdrawn;
  const peak = Math.max(...EQUITY);
  const drawdown = (((peak - Math.min(...EQUITY.slice(EQUITY.indexOf(peak)))) / peak) * 100) || 0;

  return (
    <>
      <PageHeader eyebrow="Peníze" title="Bankroll" />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Aktuální bankroll" value={ACCOUNT.bankroll.toLocaleString("cs-CZ")} unit="Kč" />
        <Stat label="Vloženo celkem" value={deposited.toLocaleString("cs-CZ")} unit="Kč" />
        <Stat label="Vybráno" value={withdrawn.toLocaleString("cs-CZ")} unit="Kč" />
        <Stat label="Čistý zisk" value={`+${net.toLocaleString("cs-CZ")}`} unit="Kč" delta="po odečtení vkladů" />
      </div>

      <Card className="mb-4 p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="eyebrow">Vývoj bankrollu · 30 dní</p>
          <p className="data text-[12px] text-ash">
            vrchol {peak.toFixed(1)}k · propad {drawdown.toFixed(1)} %
          </p>
        </div>
        <Sparkline points={EQUITY} height={200} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <p className="eyebrow px-5 py-4">Pohyby</p>
          <div className="scroll-x">
            <table className="w-full min-w-[420px] text-left">
              <thead>
                <tr style={{ borderTop: "1px solid rgba(126,240,168,0.08)" }}>
                  {["Datum", "Popis", "Částka"].map((h) => (
                    <th key={h} className="eyebrow px-5 py-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOVEMENTS.map((m) => (
                  <tr key={m.date + m.label} style={{ borderTop: "1px solid rgba(126,240,168,0.06)" }}>
                    <td className="data px-5 py-3.5 text-[13px] text-ash-2">{m.date}</td>
                    <td className="px-5 py-3.5 text-[14px] text-chalk">{m.label}</td>
                    <td className="data px-5 py-3.5 text-[13.5px]" style={{ color: m.amount > 0 ? "#7ef0a8" : "#ff6b6b" }}>
                      {m.amount > 0 ? "+" : ""}{m.amount.toLocaleString("cs-CZ")} Kč
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <p className="eyebrow">Rozdělení sázek</p>
          <p className="data mt-2.5 text-[28px] font-semibold leading-none text-chalk">
            {unitSize().toLocaleString("cs-CZ")} <span className="text-[14px] font-normal text-ash">Kč / jednotka</span>
          </p>
          <p className="mt-2 text-[12.5px] text-ash">{ACCOUNT.unitPct} % z aktuálního bankrollu</p>

          <div className="mt-5 space-y-2.5">
            {[
              ["0,5 jednotky", 0.5],
              ["1 jednotka", 1],
              ["2 jednotky", 2],
              ["3 jednotky", 3],
            ].map(([label, mult]) => (
              <div key={label as string} className="flex items-baseline justify-between">
                <span className="text-[13px] text-ash">{label}</span>
                <span className="data text-[13.5px] text-chalk">
                  {Math.round(unitSize() * (mult as number)).toLocaleString("cs-CZ")} Kč
                </span>
              </div>
            ))}
          </div>

          <p className="mt-5 text-[11.5px] leading-relaxed text-ash-2">
            Jednotka se přepočítává z aktuálního bankrollu. Když bankroll klesne,
            klesne i sázka — to je celý smysl, drží tě to ve hře i přes propad.
          </p>
        </Card>
      </div>

      <Disclaimer />
    </>
  );
}
