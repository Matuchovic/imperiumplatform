import { ACCOUNT, BY_MONTH, BY_SPORT } from "@/lib/data";
import { Card, Disclaimer, PageHeader, Stat } from "@/components/dashboard/ui";

export default function Statistiky() {
  const maxAbs = Math.max(...BY_MONTH.map((m) => Math.abs(m.profit)));

  return (
    <>
      <PageHeader eyebrow="Rozbor" title="Statistiky" />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Tiketů celkem" value={ACCOUNT.ticketsTotal.toString()} />
        <Stat label="Úspěšnost" value="61,8" unit="%" />
        <Stat label="ROI" value="+12,4" unit="%" />
        <Stat label="Yield" value="8,1" unit="%" />
      </div>

      <Card className="mb-4 overflow-hidden">
        <p className="eyebrow px-5 py-4">Podle sportu</p>
        <div className="scroll-x">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr style={{ borderTop: "1px solid rgba(126,240,168,0.08)" }}>
                {["Sport", "Tiketů", "Úspěšnost", "ROI", "Podíl"].map((h) => (
                  <th key={h} className="eyebrow px-5 py-3 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BY_SPORT.map((s) => (
                <tr key={s.sport} style={{ borderTop: "1px solid rgba(126,240,168,0.06)" }}>
                  <td className="px-5 py-3.5 text-[14px] text-chalk">{s.sport}</td>
                  <td className="data px-5 py-3.5 text-[13.5px] text-ash">{s.tickets}</td>
                  <td className="data px-5 py-3.5 text-[13.5px] text-chalk">{s.hit.toString().replace(".", ",")} %</td>
                  <td className="data px-5 py-3.5 text-[13.5px] text-signal">+{s.roi.toString().replace(".", ",")} %</td>
                  <td className="px-5 py-3.5" style={{ width: 160 }}>
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(s.tickets / ACCOUNT.ticketsTotal) * 100}%`,
                          background: "#7ef0a8",
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <p className="eyebrow mb-5">Zisk po měsících</p>
        <div className="flex items-end gap-3" style={{ height: 180 }}>
          {BY_MONTH.map((m) => {
            const h = (Math.abs(m.profit) / maxAbs) * 130;
            const up = m.profit >= 0;
            return (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <span className="data text-[11px]" style={{ color: up ? "#7ef0a8" : "#ff6b6b" }}>
                  {up ? "+" : ""}{(m.profit / 1000).toFixed(1)}k
                </span>
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: Math.max(h, 4),
                    background: up ? "linear-gradient(180deg,#7ef0a8,#16a34a)" : "linear-gradient(180deg,#ff6b6b,#7a2020)",
                  }}
                />
                <span className="text-[11px] text-ash-2">{m.month.slice(0, 3)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-[11.5px] leading-relaxed text-ash-2">
          Duben skončil ve ztrátě. Ztrátový měsíc není porucha systému — je to normální
          součást rozptylu a proto se sází v jednotkách, ne v pevných částkách.
        </p>
      </Card>

      <Disclaimer />
    </>
  );
}
