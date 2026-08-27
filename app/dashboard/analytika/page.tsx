import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { performance, confidenceNote, type SettledTicket } from "@/lib/stats/performance";
import { BANDS } from "@/lib/engine/bands";
import { PageTitle } from "@/components/admin/PageTitle";
import { Stat, Panel, Row } from "@/components/admin/ui";
import { log } from "@/lib/log";
import Info from "@/components/napoveda/Info";
import Rozbal from "@/components/napoveda/Rozbal";
import Pojem from "@/components/napoveda/Pojem";

export const dynamic = "force-dynamic";

const OBDOBI: Record<string, { dni: number; label: string }> = {
  "7d": { dni: 7, label: "7 dní" },
  "30d": { dni: 30, label: "30 dní" },
  "90d": { dni: 90, label: "90 dní" },
  all: { dni: 3650, label: "vše" },
};

type Radek = {
  stake: number; profit: number; odds: number;
  clv: number | null; band: string | null; market: string | null;
};

export default async function Analytika({
  searchParams,
}: {
  searchParams: Promise<{ obdobi?: string }>;
}) {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (me.role === "klient") redirect("/dashboard");

  const sp = await searchParams;
  const klic = OBDOBI[sp.obdobi ?? "30d"] ? (sp.obdobi ?? "30d") : "30d";
  const od = new Date(Date.now() - OBDOBI[klic].dni * 864e5).toISOString();

  let rows: Radek[] = [];
  let chyba = false;

  try {
    const db = serviceClient();
    const { data, error } = await db
      .from("tickets")
      .select("stake, profit, odds, clv, band, market")
      .neq("state", "open")
      .gte("placed_at", od)
      .limit(5000);
    if (error) throw error;
    rows = (data ?? []) as Radek[];
  } catch (err) {
    chyba = true;
    log("error", "analytika", "načtení selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const naTiket = (r: Radek): SettledTicket => ({
    stake: Number(r.stake), profit: Number(r.profit),
    odds: Number(r.odds), clv: r.clv === null ? null : Number(r.clv),
  });

  const celkem = performance(rows.map(naTiket));

  const podlePasem = BANDS.map((b) => ({
    band: b,
    perf: performance(rows.filter((r) => r.band === b.key).map(naTiket)),
  }));

  const trhy = [...new Set(rows.map((r) => r.market).filter(Boolean))] as string[];
  const podleTrhu = trhy
    .map((t) => ({ trh: t, perf: performance(rows.filter((r) => r.market === t).map(naTiket)) }))
    .filter((x) => x.perf.count > 0)
    .sort((a, b) => b.perf.count - a.perf.count)
    .slice(0, 8);

  const pct = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n} %`);

  return (
    <>
      <PageTitle
        title="Analytika"
        lead="CLV je hlavní ukazatel — ustálí se dřív než zisk. U ROI je vždy uvedený interval, protože samotné číslo při malém vzorku nic neznamená."
      />

      <Info klic="analytika">
        <b><Pojem klic="clv">CLV</Pojem> je hlavní ukazatel, ne zisk.</b> Říká, jestli jste sázeli za lepší kurz,
        než byl těsně před výkopem. Ustálí se řádově dřív než zisk — po sto tiketech
        už něco znamená, kdežto ROI potřebuje tisíce.
      </Info>

      <Rozbal otazka="Jak se počítá doporučená sázka?">
        <p>
          Systém vychází z <Pojem klic="kelly">Kellyho kritéria</Pojem> — vzorce, který
          určuje, kolik vsadit, aby <Pojem klic="bankroll">bankroll</Pojem> rostl
          co nejrychleji a přitom nespadl na nulu.
        </p>
        <p>
          Používá se ale jen <b>čtvrtina</b> toho, co Kelly navrhuje. Plný Kelly je
          matematicky nejrychlejší, ale kolísání je tak velké, že ho většina lidí
          psychicky neustojí — <Pojem klic="drawdown">propad</Pojem> o polovinu bankrollu
          je při něm běžný.
        </p>
        <p>
          Výsledek se pak zastropuje limitem klienta, takže žádný tip nepřekročí to,
          co má nastavené.
        </p>
      </Rozbal>

      <Rozbal otazka="Proč se u ROI ukazuje interval?">
        <p>
          Samotné číslo při malém vzorku nic neznamená. Po padesáti tiketech může
          <b> +8 % stejně dobře znamenat −3 %</b> — rozdíl je čistě náhoda.
        </p>
        <p>
          Interval říká, mezi jakými hodnotami se skutečná výkonnost nejspíš pohybuje.
          Když zahrnuje nulu, zisk zatím <b>nejde odlišit od štěstí</b>.
        </p>
      </Rozbal>

      <div className="adm-actions" style={{ marginTop: 0 }}>
        {Object.entries(OBDOBI).map(([k, o]) => (
          <a
            key={k}
            href={`/dashboard/analytika?obdobi=${k}`}
            className={`adm-btn ${k === klic ? "adm-btn--primary" : ""}`}
          >
            {o.label}
          </a>
        ))}
      </div>

      {chyba ? (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Načtení dat selhalo.</span>
          </span>
        </div>
      ) : celkem.count === 0 ? (
        <Panel
          title="Za tohle období nejsou data"
          lead="Analytika se naplní, jakmile se vyhodnotí první tikety."
        >
          <span />
        </Panel>
      ) : (
        <>
          <div className="adm-cards">
            <Stat
              label="CLV"
              value={celkem.avgClv === null ? "—" : `${celkem.avgClv > 0 ? "+" : ""}${celkem.avgClv}`}
              unit={celkem.avgClv === null ? undefined : "%"}
              note={celkem.clvCount ? `z ${celkem.clvCount} tiketů` : "bez uzavíracích kurzů"}
              tone={celkem.avgClv !== null && celkem.avgClv > 0 ? "good" : "neutral"}
            />
            <Stat
              label="ROI"
              value={`${celkem.roi > 0 ? "+" : ""}${celkem.roi}`}
              unit="%"
              note={celkem.roiInterval ? `${celkem.roiInterval[0]} až ${celkem.roiInterval[1]}` : "vzorek je malý"}
              tone={celkem.proven ? "good" : "warn"}
            />
            <Stat label="Vyhodnoceno" value={String(celkem.count)} note={`${celkem.won} výher`} />
            <Stat label="Úspěšnost" value={`${celkem.winRate}`} unit="%" note={`průměrný kurz ${celkem.avgOdds}`} />
          </div>

          <Panel title="Co z toho plyne" lead={confidenceNote(celkem)}>
            <div style={{ marginTop: 10 }}>
              <Row
                label="Zisk"
                value={`${celkem.profit > 0 ? "+" : ""}${celkem.profit.toLocaleString("cs-CZ")} Kč`}
                tone={celkem.profit >= 0 ? "good" : "bad"}
                meta={`vsazeno ${celkem.staked.toLocaleString("cs-CZ")} Kč`}
              />
              <Row label="Výhry / prohry / zrušené" value={`${celkem.won} / ${celkem.lost} / ${celkem.void}`} />
              {celkem.needForProof && (
                <Row
                  label="Na průkaz potřeba"
                  value={`${celkem.needForProof.toLocaleString("cs-CZ")} tiketů`}
                  tone="warn"
                  meta="při současné výkonnosti"
                />
              )}
            </div>
          </Panel>

          <Panel
            title="Podle pásem"
            lead="Očekávaná úspěšnost vychází ze simulace, ne z tohoto vzorku. Rozdíl proti skutečnosti je při malém počtu tiketů běžný."
          >
            <div className="scroll-x" style={{ marginTop: 10 }}>
              <table className="an-tab">
                <thead>
                  <tr>
                    <th>Pásmo</th><th>Tiketů</th><th>CLV</th><th>ROI</th>
                    <th>Úspěšnost</th><th>Očekávaná</th>
                  </tr>
                </thead>
                <tbody>
                  {podlePasem.map(({ band, perf }) => (
                    <tr key={band.key}>
                      <td>{band.label}</td>
                      <td className="data">{perf.count}</td>
                      <td className="data" style={{ color: (perf.avgClv ?? 0) > 0 ? "#7ef0a8" : "#8fa396" }}>
                        {pct(perf.avgClv)}
                      </td>
                      <td className="data">{perf.count ? pct(perf.roi) : "—"}</td>
                      <td className="data">{perf.count ? `${perf.winRate} %` : "—"}</td>
                      <td className="data an-dim">{band.hitRate[0]}–{band.hitRate[1]} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {podleTrhu.length > 0 && (
            <Panel title="Podle trhu">
              <div className="scroll-x" style={{ marginTop: 10 }}>
                <table className="an-tab">
                  <thead>
                    <tr><th>Trh</th><th>Tiketů</th><th>CLV</th><th>ROI</th><th>Průměrný kurz</th></tr>
                  </thead>
                  <tbody>
                    {podleTrhu.map(({ trh, perf }) => (
                      <tr key={trh}>
                        <td>{trh}</td>
                        <td className="data">{perf.count}</td>
                        <td className="data" style={{ color: (perf.avgClv ?? 0) > 0 ? "#7ef0a8" : "#8fa396" }}>
                          {pct(perf.avgClv)}
                        </td>
                        <td className="data">{pct(perf.roi)}</td>
                        <td className="data">{perf.avgOdds}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
