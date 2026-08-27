import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { Stat, Panel } from "@/components/admin/ui";
import { log } from "@/lib/log";
import Info from "@/components/napoveda/Info";

export const dynamic = "force-dynamic";

type Kampan = {
  id: number;
  nazev: string;
  kanal: string;
  predmet: string | null;
  stav: string;
  odeslat_v: string | null;
  prijemcu: number;
  odeslano: number;
  doruceno: number;
  otevreno: number;
  odhlaseno: number;
  created_at: string;
};

const STAV: Record<string, { label: string; barva: string }> = {
  koncept: { label: "koncept", barva: "#8fa396" },
  naplanovano: { label: "naplánováno", barva: "#ffc94a" },
  odesila_se: { label: "odesílá se", barva: "#5eead4" },
  odeslano: { label: "odesláno", barva: "#7ef0a8" },
  zastaveno: { label: "zastaveno", barva: "#ff8a8a" },
};

const KANAL: Record<string, string> = { email: "mail", sms: "message", telegram: "brand-telegram" };

export default async function Komunikace() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (me.role === "klient") redirect("/dashboard");

  let kampane: Kampan[] = [];
  let sSouhlasem = 0;
  let klientu = 0;
  let chyba = false;

  try {
    const db = serviceClient();
    const [k, s, c] = await Promise.all([
      db.from("kampane")
        .select("id, nazev, kanal, predmet, stav, odeslat_v, prijemcu, odeslano, doruceno, otevreno, odhlaseno, created_at")
        .order("created_at", { ascending: false }).limit(50),
      db.from("profiles").select("id", { count: "exact", head: true })
        .eq("role", "klient").eq("marketing_ok", true),
      db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "klient"),
    ]);
    if (k.error) throw k.error;
    kampane = (k.data ?? []) as Kampan[];
    sSouhlasem = s.count ?? 0;
    klientu = c.count ?? 0;
  } catch (err) {
    chyba = true;
    log("error", "komunikace", "načtení selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const odeslano = kampane.filter((k) => k.stav === "odeslano");
  const mira = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

  return (
    <>
      <PageTitle
        title="Email a SMS"
        lead="Kampaně odcházejí jen klientům se souhlasem. Odhlášení platí okamžitě napříč všemi kanály."
      />

      <Info klic="komunikace" tón="pozor">
        <b>Kampaň jde odeslat jen klientům se souhlasem.</b> Zákon 480/2004 vyžaduje
        předchozí souhlas — bez něj se rozesílka nespustí. Odhlášení platí okamžitě
        napříč všemi kanály.
      </Info>

      {chyba ? (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Tabulka kampaní zatím neexistuje.</span>{" "}
            <span className="adm-alert__detail">Spusť supabase/sekce.sql.</span>
          </span>
        </div>
      ) : (
        <>
          <div className="adm-cards">
            <Stat
              label="Se souhlasem"
              value={String(sSouhlasem)}
              note={klientu ? `z ${klientu} klientů` : undefined}
              tone={sSouhlasem === 0 && klientu > 0 ? "warn" : "neutral"}
            />
            <Stat label="Kampaní" value={String(kampane.length)} note={`${odeslano.length} odesláno`} />
            <Stat
              label="Doručenost"
              value={odeslano.length
                ? String(mira(
                    odeslano.reduce((s, k) => s + k.doruceno, 0),
                    odeslano.reduce((s, k) => s + k.odeslano, 0)
                  ))
                : "—"}
              unit={odeslano.length ? "%" : undefined}
            />
            <Stat
              label="Odhlášení"
              value={String(kampane.reduce((s, k) => s + k.odhlaseno, 0))}
              tone="neutral"
            />
          </div>

          {sSouhlasem === 0 && klientu > 0 && (
            <div className="adm-alert adm-alert--warn">
              <span className="adm-alert__text">
                <span className="adm-alert__title">Nikdo nemá souhlas s marketingem.</span>{" "}
                <span className="adm-alert__detail">
                  Kampaň se nedá odeslat, dokud klienti souhlas neudělí. Zákon 480/2004
                  vyžaduje předchozí souhlas.
                </span>
              </span>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            {kampane.length === 0 ? (
              <Panel
                title="Zatím žádné kampaně"
                lead="Odesílání vyžaduje poskytovatele a ověřenou doménu. Bez SPF, DKIM a DMARC skončí zprávy ve spamu."
              >
                <span />
              </Panel>
            ) : (
              <div className="adm-panel">
                <div style={{ marginTop: 4 }}>
                  {kampane.map((k) => {
                    const s = STAV[k.stav] ?? STAV.koncept;
                    return (
                      <div key={k.id} className="sp-row">
                        <span className="sp-kanal">
                          <i className={`ti ti-${KANAL[k.kanal] ?? "mail"}`} aria-hidden="true" />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="sp-predmet">{k.nazev}</span>
                          {k.predmet && <span className="sp-zprava">{k.predmet}</span>}
                          <span className="sp-meta">
                            <span>{k.prijemcu} příjemců</span>
                            {k.odeslano > 0 && <span>otevřelo {mira(k.otevreno, k.doruceno)} %</span>}
                            {k.odhlaseno > 0 && (
                              <span style={{ color: "#ffc94a" }}>{k.odhlaseno} odhlášení</span>
                            )}
                          </span>
                        </span>
                        <span className="data sp-stav" style={{ color: s.barva }}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
