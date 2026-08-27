import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { Stat, Panel } from "@/components/admin/ui";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

type Tiket = {
  id: number;
  predmet: string;
  zprava: string | null;
  od_koho: string | null;
  kanal: string;
  stav: string;
  priorita: string;
  created_at: string;
  prvni_odpoved_at: string | null;
};

const STAV: Record<string, { label: string; barva: string }> = {
  novy: { label: "nový", barva: "#ff8a8a" },
  v_reseni: { label: "v řešení", barva: "#ffc94a" },
  ceka_na_klienta: { label: "čeká na klienta", barva: "#8fa396" },
  vyreseno: { label: "vyřešeno", barva: "#7ef0a8" },
};

const KANAL: Record<string, string> = {
  email: "mail", telegram: "brand-telegram", telefon: "phone", osobne: "user",
};

export default async function Support() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (me.role === "klient") redirect("/dashboard");

  let tikety: Tiket[] = [];
  let chyba = false;

  try {
    const db = serviceClient();
    const { data, error } = await db
      .from("tikety_podpory")
      .select("id, predmet, zprava, od_koho, kanal, stav, priorita, created_at, prvni_odpoved_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    tikety = (data ?? []) as Tiket[];
  } catch (err) {
    chyba = true;
    log("error", "support", "načtení selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const otevrene = tikety.filter((t) => t.stav !== "vyreseno");
  const nove = tikety.filter((t) => t.stav === "novy");

  // Doba do první odpovědi je jediné číslo, které o podpoře něco
  // vypovídá. Počet vyřešených tiketů říká jen to, kolik jich přišlo.
  const odpovezene = tikety.filter((t) => t.prvni_odpoved_at);
  const prumerHodin = odpovezene.length
    ? Math.round(
        odpovezene.reduce(
          (s, t) =>
            s + (new Date(t.prvni_odpoved_at!).getTime() - new Date(t.created_at).getTime()) / 36e5,
          0
        ) / odpovezene.length
      )
    : null;

  const pred = (iso: string) => {
    const h = Math.round((Date.now() - new Date(iso).getTime()) / 36e5);
    if (h < 1) return "právě teď";
    if (h < 24) return `před ${h} h`;
    return `před ${Math.round(h / 24)} dny`;
  };

  return (
    <>
      <PageTitle
        title="Support"
        lead="Dotazy klientů. Doba do první odpovědi rozhoduje o spokojenosti víc než to, jak rychle se dotaz uzavře."
      />

      {chyba ? (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Tabulka podpory zatím neexistuje.</span>{" "}
            <span className="adm-alert__detail">Spusť supabase/sekce.sql.</span>
          </span>
        </div>
      ) : (
        <>
          <div className="adm-cards">
            <Stat label="Otevřených" value={String(otevrene.length)} />
            <Stat label="Nových" value={String(nove.length)} tone={nove.length ? "warn" : "neutral"} />
            <Stat
              label="První odpověď"
              value={prumerHodin === null ? "—" : String(prumerHodin)}
              unit={prumerHodin === null ? undefined : "h"}
              note={odpovezene.length ? `z ${odpovezene.length} dotazů` : "zatím bez dat"}
            />
            <Stat label="Vyřešeno" value={String(tikety.length - otevrene.length)} />
          </div>

          <div style={{ marginTop: 20 }}>
            {tikety.length === 0 ? (
              <Panel
                title="Zatím žádné dotazy"
                lead="Až se klient ozve, objeví se tady. Ukázkové se nedoplňují."
              >
                <span />
              </Panel>
            ) : (
              <div className="adm-panel">
                <div style={{ marginTop: 4 }}>
                  {tikety.map((t) => {
                    const s = STAV[t.stav] ?? STAV.novy;
                    return (
                      <div key={t.id} className="sp-row">
                        <span className="sp-kanal">
                          <i className={`ti ti-${KANAL[t.kanal] ?? "mail"}`} aria-hidden="true" />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="sp-predmet">{t.predmet}</span>
                          {t.zprava && <span className="sp-zprava">{t.zprava}</span>}
                          <span className="sp-meta">
                            <span>{t.od_koho ?? "klient"}</span>
                            <span>{pred(t.created_at)}</span>
                            {t.priorita === "vysoka" && <span style={{ color: "#ff8a8a" }}>vysoká priorita</span>}
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
