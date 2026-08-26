import { scanForValue } from "@/lib/engine/scan";
import { DEFAULT_CONFIG } from "@/lib/engine/types";
import { PageTitle } from "@/components/admin/PageTitle";
import { Alert, Panel, Row, Stat } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const pc = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")} %`;

export default async function Motor() {
  const scan = await scanForValue();
  const open = scan.candidates.filter((c) => !c.blocked);

  return (
    <>
      <PageTitle
        title="Motor hodnoty"
        lead="Porovnává férovou pravděpodobnost z ostré knihovny s nabídkou ostatních. Nic se neodesílá bez schválení."
      />

      {!scan.live && (
        <Alert
          tone="warn"
          title="Běží na ukázkových datech."
          detail="Kurzy nejsou živé. Doplň ODDS_API_KEY a motor začne skenovat doopravdy — výpočet je v obou případech stejný."
          action="Nastavit"
        />
      )}

      <div className="adm-cards" style={{ marginTop: 18 }}>
        <Stat label="Zdroj kurzů" value={scan.provider} />
        <Stat label="Prošlo zápasů" value={String(scan.scannedMatches)} />
        <Stat label="Nabídek porovnáno" value={String(scan.scannedBooks)} />
        <Stat label="Kandidátů" value={String(open.length)} note={`hranice ${pc(DEFAULT_CONFIG.minEv)}`} />
      </div>

      {scan.candidates.length === 0 ? (
        <Panel
          title="Žádná hodnota k odeslání"
          lead={`Motor prošel ${scan.scannedMatches} zápasů a nenašel nabídku nad hranicí ${pc(DEFAULT_CONFIG.minEv)}. To je běžný stav — většinu času trh hodnotu nenabízí.`}
        >
          <span />
        </Panel>
      ) : (
        scan.candidates.map((c) => (
          <Panel key={c.id} title={c.event} lead={`${c.market}: ${c.selection} · ${c.offeredBy}`}>
            <div style={{ marginTop: 10 }}>
              <Row label="Ostrý kurz" value={c.sharpOdds.toFixed(2)} />
              <Row label="Férová pravděpodobnost" value={pc(c.fairProb)} />
              <Row label="Nabídka" value={c.offeredOdds.toFixed(2)} />
              <Row label="Vsaď nad" value={c.thresholdOdds.toFixed(2)} meta="práh pro české kanceláře" />
              <Row
                label={c.blocked ?? "Hodnota"}
                value={c.blocked ? "blokováno" : `+${pc(c.ev)}`}
                tone={c.blocked ? "bad" : "good"}
              />
              {!c.blocked && <Row label="Sázka" value={`${c.units.toFixed(1)} jed.`} />}
            </div>
            {!c.blocked && (
              <div className="adm-actions">
                <button className="adm-btn adm-btn--primary">Schválit</button>
                <button className="adm-btn">Zamítnout</button>
              </div>
            )}
          </Panel>
        ))
      )}
    </>
  );
}
