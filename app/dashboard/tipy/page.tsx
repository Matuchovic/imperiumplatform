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

  // "Nula nálezů" má dva úplně různé důvody a z obrazovky se nedaly
  // rozlišit: buď dnes hodnota není, nebo adaptér nečte kurzy.
  // Bez porovnaných nabídek nemá motor co srovnávat.
  const brokenFeed = scan.live && scan.scannedBooks === 0;
  const thinFeed = scan.live && scan.scannedMatches > 0 && scan.scannedBooks < scan.scannedMatches * 2;

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

      {brokenFeed && (
        <Alert
          tone="bad"
          title="Motor nečte kurzy."
          detail={`Prošel ${scan.scannedMatches} zápasů, ale neporovnal ani jednu nabídku. Odpověď poskytovatele má nejspíš jiný tvar, než adaptér očekává — ověř ji přes /api/engine/probe.`}
          action="Ověřit"
        />
      )}

      {!brokenFeed && thinFeed && (
        <Alert
          tone="warn"
          title="Málo nabídek k porovnání."
          detail={`${scan.scannedBooks} nabídek na ${scan.scannedMatches} zápasů. Bez ostré knihovny v datech nejde spočítat férová pravděpodobnost.`}
          action="Ověřit"
        />
      )}

      <div className="tip-diag">
        <span><span>Poskytovatel</span> {scan.provider}</span>
        <span><span>Zápasů</span> {scan.scannedMatches}</span>
        <span><span>Nabídek porovnáno</span> {scan.scannedBooks}</span>
        <span><span>Kandidátů</span> {scan.candidates.length}</span>
      </div>

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
