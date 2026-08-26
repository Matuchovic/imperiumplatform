import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { Alert, Panel, Row, Stat } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/* Demo hodnoty. Nahradí je dotazy, až budou tabulky plněné. */
const WEEKS = [
  { profit: 18, churn: 6 }, { profit: 26, churn: 4 }, { profit: 12, churn: 5 },
  { profit: -16, churn: 7 }, { profit: 22, churn: 9 }, { profit: 30, churn: 18 },
  { profit: -13, churn: 16 }, { profit: -23, churn: 11 }, { profit: 14, churn: 26 },
  { profit: 24, churn: 29 }, { profit: 34, churn: 14 }, { profit: 20, churn: 9 },
];

export default async function Prehled() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const supabase = await supabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle<{ name: string | null }>();

  const first = (profile?.name ?? "").split(" ")[0];
  const w = 560;
  const step = w / WEEKS.length;
  const bw = step - 19;

  return (
    <>
      <PageTitle
        title={first ? `Vítej zpět, ${first}` : "Přehled"}
        lead="Dnes potřebují pozornost dvě věci — motor tři hodiny neskenuje a dvě platby neprošly."
      />

      <Alert
        tone="bad"
        title="Motor tři hodiny neskenuje."
        detail="Došla kvóta u poskytovatele kurzů. Zatím to nikdo nepozná, protože prázdný sken vypadá stejně jako den bez příležitostí."
        action="Řešit"
      />
      <Alert
        tone="warn"
        title="Dvě platby neprošly."
        detail="Expirovaná karta, členství končí do tří dnů."
        action="Řešit"
      />

      <div className="adm-cards" style={{ marginTop: 18 }}>
        <Stat label="Tržby za 30 dní" value="684 200" unit="Kč" note="↗ 18,4 %" tone="good" />
        <Stat label="Platí klientů" value="312" note="↗ +7 čistě" tone="good" />
        <Stat label="Vydané tipy" value="148" note="3 čekají na schválení" />
        <Stat label="Úspěšnost tipů" value="54,7" unit="%" note="± 4,1 · vzorek je malý" tone="warn" />
      </div>

      <Panel
        title="Špatný týden se v odchodech projeví až za dva"
        lead="Zeleně zisk tipů po týdnech, dole zrušená členství. Ztrátový týden přijde zhruba devatenáctkrát ročně i při funkčním motoru — není to poplach, ale předstih na obvolání klientů."
      >
        <svg viewBox="0 0 560 96" style={{ width: "100%", height: 96, display: "block" }} role="img"
             aria-label="Týdenní zisk tipů nad osou a zrušená členství pod osou, odchody následují se zpožděním dvou týdnů">
          <line x1="0" y1="48" x2={w} y2="48" stroke="rgba(126,240,168,.16)" strokeWidth="1" />
          {WEEKS.map((d, i) => {
            const x = i * step + 6;
            const h = Math.abs(d.profit);
            return (
              <rect key={`p${i}`} x={x} y={48 - h} width={bw} height={h} rx="3"
                    fill={d.profit >= 0 ? "#7ef0a8" : "#ff6b6b"} opacity="0.9" />
            );
          })}
          {WEEKS.map((d, i) => (
            <rect key={`c${i}`} x={i * step + 6} y="48" width={bw} height={d.churn} rx="3"
                  fill="#ff6b6b" opacity="0.45" />
          ))}
        </svg>
      </Panel>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
        <Panel title="Živé tipy">
          <div style={{ marginTop: 10 }}>
            <Row label="Real Madrid – Arsenal" value="1.86" meta="live 72′" tone="good" />
            <Row label="Bruins – Maple Leafs" value="2.14" meta="live 58′" tone="good" />
            <Row label="Bayern – Liverpool" value="1.72" meta="dnes 21:00" />
          </div>
        </Panel>

        <Panel title="Čeká na tebe">
          <div style={{ marginTop: 10 }}>
            <Row label="Motor neskenuje" value="3 h" tone="bad" />
            <Row label="Neprošlé platby" value="2" tone="warn" />
            <Row label="Dotazy klientů" value="9" meta="2 přes den" />
            <Row label="Tikety ke schválení" value="3" />
          </div>
        </Panel>
      </div>

      <div className="adm-actions">
        <button className="adm-btn adm-btn--primary">
          <i className="ti ti-plus" aria-hidden="true" />
          Nový tip
        </button>
        <button className="adm-btn">
          <i className="ti ti-user-plus" aria-hidden="true" />
          Nový klient
        </button>
        <button className="adm-btn">
          <i className="ti ti-file-text" aria-hidden="true" />
          Report
        </button>
      </div>
    </>
  );
}
