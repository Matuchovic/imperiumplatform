import { Card, PageHeader } from "@/components/dashboard/ui";

export default function Telegram() {
  return (
    <>
      <PageHeader eyebrow="Doručování" title="Telegram" />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2.5">
            <span className="pulse-dot" />
            <p className="eyebrow" style={{ color: "#7ef0a8" }}>Napojeno</p>
          </div>
          <p className="data mt-3 text-[20px] text-chalk">@ondrej_m</p>
          <p className="mt-1.5 text-[13px] text-ash">Tikety chodí do soukromé konverzace.</p>

          <div className="mt-5 space-y-2.5">
            {[
              ["Doručeno tiketů", "428"],
              ["Poslední zpráva", "dnes 14:32"],
              ["Průměrné zpoždění", "1,2 s"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between">
                <span className="text-[13px] text-ash">{k}</span>
                <span className="data text-[13.5px] text-chalk">{v}</span>
              </div>
            ))}
          </div>

          <button
            className="mt-5 w-full rounded-lg py-2.5 text-[13.5px] text-ash transition-colors hover:text-chalk"
            style={{ border: "1px solid rgba(126,240,168,0.14)", background: "rgba(255,255,255,0.02)" }}
          >
            Odpojit Telegram
          </button>
        </Card>

        <Card className="p-5">
          <p className="eyebrow">Tvůj manažer</p>
          <div className="mt-4 flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-[14px] font-medium"
              style={{ background: "rgba(126,240,168,0.14)", color: "#7ef0a8" }}
            >
              MK
            </div>
            <div>
              <p className="text-[15px] font-medium text-chalk">Martin Kříž</p>
              <p className="text-[12.5px] text-ash">Plán pro · odpovídá do 30 minut</p>
            </div>
          </div>

          <a
            href="https://t.me/"
            className="btn-primary mt-5"
            style={{ textDecoration: "none" }}
          >
            Napsat manažerovi
          </a>

          <p className="mt-4 text-[11.5px] leading-relaxed text-ash-2">
            Manažer radí s postupem a bankrollem. Sázky za tebe nepodává a nemá
            přístup k tvému účtu u sázkové kanceláře.
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <p className="eyebrow mb-4">Co ti chodí</p>
        {[
          ["Nové tikety", "Ihned po vypsání, včetně kurzu a počtu jednotek.", true],
          ["Výsledky", "Souhrn večer po dohrání zápasů.", true],
          ["Změny plánu", "Když manažer upraví postup nebo jednotku.", true],
          ["Marketing", "Nabídky a akce. Vypnuto.", false],
        ].map(([title, desc, on], i) => (
          <div
            key={title as string}
            className="flex items-start justify-between gap-4 py-3"
            style={i > 0 ? { borderTop: "1px solid rgba(126,240,168,0.07)" } : undefined}
          >
            <div>
              <p className="text-[14px] text-chalk">{title}</p>
              <p className="mt-0.5 text-[12.5px] text-ash">{desc}</p>
            </div>
            <span
              className="mt-1 flex h-5 w-9 shrink-0 items-center rounded-full px-0.5"
              style={{ background: on ? "rgba(126,240,168,0.3)" : "rgba(255,255,255,0.07)" }}
            >
              <span
                className="h-4 w-4 rounded-full transition-transform"
                style={{ background: on ? "#7ef0a8" : "#5b6c61", transform: on ? "translateX(16px)" : "none" }}
              />
            </span>
          </div>
        ))}
      </Card>
    </>
  );
}
