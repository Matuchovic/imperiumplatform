import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import Logo from "@/components/brand/Logo";
import LogoutButton from "@/components/dashboard/LogoutButton";

const NAV = [
  { label: "Přehled", href: "/dashboard", active: true },
  { label: "Tikety", href: "/dashboard/tikety" },
  { label: "Můj plán", href: "/dashboard/plan" },
  { label: "Bankroll", href: "/dashboard/bankroll" },
  { label: "Statistiky", href: "/dashboard/statistiky" },
  { label: "Telegram", href: "/dashboard/telegram" },
  { label: "Nastavení", href: "/dashboard/nastaveni" },
];

const TICKETS = [
  { id: "T-2418", event: "Sparta – Slavia", market: "Over 2.5", odds: "1.85", stake: "2,0", state: "live" },
  { id: "T-2417", event: "Lakers – Celtics", market: "AH -3.5", odds: "1.92", stake: "1,5", state: "won" },
  { id: "T-2416", event: "Arsenal – Chelsea", market: "BTTS ano", odds: "1.72", stake: "2,0", state: "won" },
  { id: "T-2415", event: "Djoković – Alcaraz", market: "Over 3.5 setů", odds: "2.40", stake: "1,0", state: "lost" },
  { id: "T-2414", event: "Kometa – Třinec", market: "1X", odds: "1.65", stake: "2,5", state: "won" },
];

const STATE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  live: { label: "Živě", color: "#ffc94a", bg: "rgba(255,201,74,0.12)" },
  won: { label: "Výhra", color: "#7ef0a8", bg: "rgba(126,240,168,0.12)" },
  lost: { label: "Prohra", color: "#ff6b6b", bg: "rgba(255,107,107,0.12)" },
};

/* body equity křivky posledních 30 dní (v tisících Kč) */
const EQUITY = [
  18.0, 18.4, 17.9, 19.1, 19.6, 19.2, 20.4, 21.0, 20.5, 21.8,
  22.6, 22.1, 23.4, 24.0, 23.5, 25.1, 25.9, 25.4, 26.8, 27.6,
  27.1, 28.9, 29.7, 29.2, 30.8, 31.6, 31.1, 32.9, 33.8, 34.2,
];

function Sparkline({ points }: { points: number[] }) {
  const w = 640;
  const h = 160;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - ((p - min) / (max - min)) * (h - 16) - 8).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[160px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(126,240,168,0.28)" />
          <stop offset="100%" stopColor="rgba(126,240,168,0)" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="url(#dashFill)" />
      <path
        d={d}
        fill="none"
        stroke="#7ef0a8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 8px rgba(126,240,168,0.5))" }}
      />
    </svg>
  );
}

function Stat({ label, value, unit, delta, positive = true }: {
  label: string; value: string; unit?: string; delta?: string; positive?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "rgba(12,19,16,0.7)", border: "1px solid rgba(126,240,168,0.1)" }}
    >
      <p className="eyebrow">{label}</p>
      <p className="data mt-2.5 text-[28px] font-semibold leading-none text-chalk">
        {value}
        {unit && <span className="ml-1 text-[14px] font-normal text-ash">{unit}</span>}
      </p>
      {delta && (
        <p className="data mt-2 text-[12px]" style={{ color: positive ? "#7ef0a8" : "#ff6b6b" }}>
          {delta} <span className="text-ash-2">za 30 dní</span>
        </p>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  const goal = 50_000;
  const current = 34_200;
  const pct = Math.round((current / goal) * 100);

  return (
    <div className="relative min-h-dvh">
      {/* tlumené pozadí — na dashboardu ustupuje datům */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(110% 70% at 15% -10%, #0a1712 0%, transparent 55%), #050706",
        }}
      />

      <div className="relative z-10 flex min-h-dvh">
        {/* sidebar */}
        <aside
          className="hidden w-[236px] shrink-0 flex-col p-5 lg:flex"
          style={{ borderRight: "1px solid rgba(126,240,168,0.09)" }}
        >
          <div className="mb-8 px-1">
            <Logo size={19} />
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-[14px] transition-colors"
                style={
                  item.active
                    ? { background: "rgba(126,240,168,0.1)", color: "#ecfdf2", border: "1px solid rgba(126,240,168,0.16)" }
                    : { color: "#8fa396" }
                }
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div
            className="mt-auto rounded-xl p-4"
            style={{ background: "rgba(126,240,168,0.05)", border: "1px solid rgba(126,240,168,0.12)" }}
          >
            <p className="eyebrow" style={{ color: "#7ef0a8" }}>
              Plán {session.plan}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ash">
              Manažer odpovídá na Telegramu obvykle do 30 minut.
            </p>
          </div>
        </aside>

        {/* obsah */}
        <main className="min-w-0 flex-1 p-5 sm:p-8">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Přehled</p>
              <h1 className="display mt-1 text-[26px] font-semibold text-chalk">
                Vítej zpět, {session.name.split(" ")[0]}
              </h1>
            </div>
            <LogoutButton />
          </header>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Bankroll" value="34 200" unit="Kč" delta="+16 200 Kč" />
            <Stat label="ROI" value="+12,4" unit="%" delta="+3,1 p. b." />
            <Stat label="Úspěšnost" value="61,8" unit="%" delta="−1,2 p. b." positive={false} />
            <Stat label="Aktivní tikety" value="3" delta="1 čeká na výsledek" />
          </div>

          <div className="mb-6 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <section
              className="rounded-2xl p-5"
              style={{ background: "rgba(12,19,16,0.7)", border: "1px solid rgba(126,240,168,0.1)" }}
            >
              <div className="mb-4 flex items-baseline justify-between">
                <p className="eyebrow">Vývoj bankrollu · 30 dní</p>
                <p className="data text-[12px] text-signal">+90,0 %</p>
              </div>
              <Sparkline points={EQUITY} />
            </section>

            <section
              className="rounded-2xl p-5"
              style={{ background: "rgba(12,19,16,0.7)", border: "1px solid rgba(126,240,168,0.1)" }}
            >
              <p className="eyebrow">Cíl plánu</p>
              <p className="data mt-2.5 text-[28px] font-semibold leading-none text-chalk">
                34 200 <span className="text-[15px] font-normal text-ash-2">/ 50 000 Kč</span>
              </p>

              <div
                className="mt-5 h-2 w-full overflow-hidden rounded-full"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
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
                {pct} % splněno · zbývá 15 800 Kč
              </p>

              <p className="mt-5 text-[12.5px] leading-relaxed text-ash-2">
                Postup vychází z dosavadních výsledků. Není to předpověď ani závazek —
                další období může skončit ztrátou.
              </p>
            </section>
          </div>

          {/* tikety */}
          <section
            className="overflow-hidden rounded-2xl"
            style={{ background: "rgba(12,19,16,0.7)", border: "1px solid rgba(126,240,168,0.1)" }}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <p className="eyebrow">Poslední tikety</p>
              <a href="/dashboard/tikety" className="text-[13px] text-signal hover:underline">
                Zobrazit vše
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr style={{ borderTop: "1px solid rgba(126,240,168,0.08)" }}>
                    {["Tiket", "Zápas", "Sázka", "Kurz", "Jednotky", "Stav"].map((h) => (
                      <th key={h} className="eyebrow px-5 py-3 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TICKETS.map((t) => {
                    const s = STATE_STYLE[t.state];
                    return (
                      <tr key={t.id} style={{ borderTop: "1px solid rgba(126,240,168,0.06)" }}>
                        <td className="data px-5 py-3.5 text-[13px] text-ash-2">{t.id}</td>
                        <td className="px-5 py-3.5 text-[14px] text-chalk">{t.event}</td>
                        <td className="px-5 py-3.5 text-[13.5px] text-ash">{t.market}</td>
                        <td className="data px-5 py-3.5 text-[13.5px] text-chalk">{t.odds}</td>
                        <td className="data px-5 py-3.5 text-[13.5px] text-ash">{t.stake}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className="data rounded-md px-2 py-1 text-[11px]"
                            style={{ color: s.color, background: s.bg }}
                          >
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-6 text-[11.5px] leading-relaxed text-ash-2/80">
            Uvedené hodnoty jsou historické výsledky a nepředstavují záruku budoucích
            výnosů. Sázej jen částky, o které si můžeš dovolit přijít. 18+
          </p>
        </main>
      </div>
    </div>
  );
}
