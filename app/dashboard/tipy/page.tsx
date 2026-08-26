import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { scanForValue } from "@/lib/engine/scan";
import { bandSummary } from "@/lib/engine/dispatch";
import { PageTitle } from "@/components/admin/PageTitle";
import { Alert } from "@/components/admin/ui";
import BandCard from "@/components/admin/BandCard";

export const dynamic = "force-dynamic";

export default async function Tipy() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (me.role === "client") redirect("/dashboard");

  const scan = await scanForValue();
  const groups = bandSummary(scan.candidates);
  const total = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <>
      <PageTitle
        title="Dnešní nálezy podle pásma"
        lead={`Motor prošel ${scan.scannedMatches} zápasů. Nálezy se třídí podle kurzu — v každém pásmu vypadá stejná výhoda jinak a klient to musí vědět předem.`}
      />

      {!scan.live && (
        <Alert
          tone="warn"
          title="Běží na ukázkových datech."
          detail="Doplň ODDS_API_KEY a motor začne skenovat živě. Výpočet je v obou případech stejný."
          action="Nastavit"
        />
      )}

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))",
          marginTop: 18,
        }}
      >
        {groups.map(({ band, items }) => (
          <BandCard key={band.key} band={band} items={items} />
        ))}
      </div>

      <div className="adm-actions">
        <button className="adm-btn adm-btn--primary" disabled={total === 0}>
          Schválit a rozeslat {total > 0 ? total : ""}
        </button>
        <button className="adm-btn">Zobrazit výpočet</button>
      </div>

      <p className="adm-todo__note" style={{ marginTop: 16 }}>
        Základ a Standard odcházejí automaticky každých 15 minut. Rozšířený
        a Odvážný čekají na schválení — mají série proher přes dvacet tiketů
        a odeslaný tip se nedá vzít zpátky.
      </p>
    </>
  );
}
