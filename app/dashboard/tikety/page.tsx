import { TICKETS } from "@/lib/data";
import { Card, Disclaimer, PageHeader, StateBadge } from "@/components/dashboard/ui";

export default function Tikety() {
  const settled = TICKETS.filter((t) => t.state === "won" || t.state === "lost");
  const won = settled.filter((t) => t.state === "won").length;
  const profit = TICKETS.reduce((s, t) => s + t.profit, 0);

  return (
    <>
      <PageHeader eyebrow="Historie" title="Tikety" />

      <div className="mb-6 flex flex-wrap gap-2">
        {["Vše", "Živě", "Výhra", "Prohra", "Zrušeno"].map((f, i) => (
          <span
            key={f}
            className="rounded-lg px-3.5 py-2 text-[13px]"
            style={
              i === 0
                ? { background: "rgba(126,240,168,0.12)", color: "#ecfdf2", border: "1px solid rgba(126,240,168,0.3)" }
                : { color: "#8fa396", border: "1px solid rgba(126,240,168,0.12)" }
            }
          >
            {f}
          </span>
        ))}
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl p-5" style={{ background: "rgba(12,19,16,0.7)", border: "1px solid rgba(126,240,168,0.1)" }}>
          <p className="eyebrow">Zobrazeno</p>
          <p className="data mt-2.5 text-[24px] font-semibold leading-none text-chalk">{TICKETS.length}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: "rgba(12,19,16,0.7)", border: "1px solid rgba(126,240,168,0.1)" }}>
          <p className="eyebrow">Úspěšnost výběru</p>
          <p className="data mt-2.5 text-[24px] font-semibold leading-none text-chalk">
            {((won / settled.length) * 100).toFixed(1)} <span className="text-[14px] font-normal text-ash">%</span>
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: "rgba(12,19,16,0.7)", border: "1px solid rgba(126,240,168,0.1)" }}>
          <p className="eyebrow">Zisk z výběru</p>
          <p className="data mt-2.5 text-[24px] font-semibold leading-none" style={{ color: profit >= 0 ? "#7ef0a8" : "#ff6b6b" }}>
            {profit >= 0 ? "+" : ""}{profit.toLocaleString("cs-CZ")} <span className="text-[14px] font-normal text-ash">Kč</span>
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr>
                {["Tiket", "Datum", "Sport", "Zápas", "Sázka", "Kurz", "Jed.", "Stav", "Zisk"].map((h) => (
                  <th key={h} className="eyebrow px-5 py-3.5 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TICKETS.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid rgba(126,240,168,0.06)" }}>
                  <td className="data px-5 py-3.5 text-[13px] text-ash-2">{t.id}</td>
                  <td className="data px-5 py-3.5 text-[13px] text-ash-2">{t.date}</td>
                  <td className="px-5 py-3.5 text-[13.5px] text-ash">{t.sport}</td>
                  <td className="px-5 py-3.5 text-[14px] text-chalk">{t.event}</td>
                  <td className="px-5 py-3.5 text-[13.5px] text-ash">{t.market}</td>
                  <td className="data px-5 py-3.5 text-[13.5px] text-chalk">{t.odds.toFixed(2)}</td>
                  <td className="data px-5 py-3.5 text-[13.5px] text-ash">{t.units.toFixed(1)}</td>
                  <td className="px-5 py-3.5"><StateBadge state={t.state} /></td>
                  <td className="data px-5 py-3.5 text-[13.5px]" style={{ color: t.profit > 0 ? "#7ef0a8" : t.profit < 0 ? "#ff6b6b" : "#5b6c61" }}>
                    {t.profit === 0 ? "—" : `${t.profit > 0 ? "+" : ""}${t.profit.toLocaleString("cs-CZ")}`}
                  </td>
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
