import { scanForValue } from "@/lib/engine/scan";
import { DEFAULT_CONFIG } from "@/lib/engine/types";
import { Card, Disclaimer, PageHeader } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";

const pc = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")} %`;

export default async function Motor() {
  const scan = await scanForValue();
  const open = scan.candidates.filter((c) => !c.blocked);

  return (
    <>
      <PageHeader eyebrow="Motor hodnoty" title="Kandidáti k odeslání" />

      {!scan.live && (
        <div
          className="mb-5 rounded-xl px-4 py-3 text-[13px] leading-relaxed"
          style={{ background: "rgba(255,201,74,0.07)", border: "1px solid rgba(255,201,74,0.26)", color: "#ffd88a" }}
        >
          Běží na ukázkových datech. Kurzy nejsou živé — doplň{" "}
          <span className="data">ODDS_API_KEY</span> a motor začne skenovat doopravdy.
          Výpočet je v obou případech stejný.
        </div>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Zdroj", scan.provider],
          ["Zápasů", String(scan.scannedMatches)],
          ["Nabídek", String(scan.scannedBooks)],
          ["Kandidátů", String(open.length)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl p-5" style={{ background: "rgba(12,19,16,0.7)", border: "1px solid rgba(126,240,168,0.1)" }}>
            <p className="eyebrow">{k}</p>
            <p className="data mt-2.5 text-[22px] font-semibold leading-none text-chalk">{v}</p>
          </div>
        ))}
      </div>

      {scan.candidates.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[15px] text-chalk">Žádná hodnota k odeslání</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ash">
            Motor prošel {scan.scannedMatches} zápasů a nenašel nabídku nad hranicí{" "}
            {pc(DEFAULT_CONFIG.minEv)}. To je běžný stav — většinu času trh hodnotu nenabízí.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {scan.candidates.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] text-chalk">{c.event}</p>
                  <p className="data mt-1 text-[12.5px] text-ash">
                    {c.market}: {c.selection} · {c.offeredBy}
                  </p>
                </div>
                {c.blocked ? (
                  <span className="data rounded-md px-2.5 py-1.5 text-[11.5px]" style={{ color: "#ff6b6b", background: "rgba(255,107,107,0.12)" }}>
                    {c.blocked}
                  </span>
                ) : (
                  <span className="data rounded-md px-2.5 py-1.5 text-[12px]" style={{ color: "#04140a", background: "#7ef0a8" }}>
                    +{pc(c.ev)}
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Ostrý kurz", c.sharpOdds.toFixed(2)],
                  ["Férová p.", pc(c.fairProb)],
                  ["Nabídka", c.offeredOdds.toFixed(2)],
                  ["Sázka", `${c.units.toFixed(1)} jed.`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="eyebrow">{k}</p>
                    <p className="data mt-1.5 text-[15px] text-chalk">{v}</p>
                  </div>
                ))}
              </div>

              {!c.blocked && (
                <div className="mt-4 flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "1px solid rgba(126,240,168,0.08)" }}>
                  <span className="flex-1 text-[11.5px] leading-relaxed text-ash-2">
                    Kurz se ověří znovu před odesláním. Pokud hodnota zmizí, tiket neodejde.
                  </span>
                  <button className="rounded-lg px-4 py-2.5 text-[13px]" style={{ border: "1px solid rgba(255,107,107,0.28)", color: "#ff9b9b" }}>
                    Zamítnout
                  </button>
                  <button className="rounded-lg px-4 py-2.5 text-[13px] font-medium" style={{ background: "#7ef0a8", color: "#04140a" }}>
                    Schválit
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-4 p-5">
        <p className="eyebrow mb-3">Nastavení motoru</p>
        <div className="grid grid-cols-2 gap-y-2.5 sm:grid-cols-3">
          {[
            ["Ostrá knihovna", DEFAULT_CONFIG.sharpBook],
            ["Minimální hodnota", pc(DEFAULT_CONFIG.minEv)],
            ["Rozsah kurzů", `${DEFAULT_CONFIG.minOdds} – ${DEFAULT_CONFIG.maxOdds}`],
            ["Kelly", `${DEFAULT_CONFIG.kellyFraction * 100} %`],
            ["Jednotka", `${DEFAULT_CONFIG.unitPct} % bankrollu`],
            ["Strop sázky", `${DEFAULT_CONFIG.maxUnits} jed.`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 pr-4">
              <span className="text-[12.5px] text-ash">{k}</span>
              <span className="data text-[12.5px] text-chalk">{v}</span>
            </div>
          ))}
        </div>
      </Card>

      <Disclaimer />
    </>
  );
}
