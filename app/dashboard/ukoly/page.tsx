import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { Stat, Panel } from "@/components/admin/ui";
import UkolyPanel, { type Ukol } from "@/components/admin/UkolyPanel";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function Ukoly() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (me.role === "klient") redirect("/dashboard");

  let ukoly: Ukol[] = [];
  let chyba: string | null = null;

  try {
    const db = serviceClient();
    const { data, error } = await db
      .from("ukoly")
      .select("id, nazev, popis, termin, hotovo, priorita, zdroj, created_at")
      .order("hotovo")
      .order("termin", { ascending: true, nullsFirst: false })
      .limit(200);
    if (error) throw error;
    ukoly = (data ?? []) as Ukol[];
  } catch (err) {
    chyba = err instanceof Error ? err.message : String(err);
    log("error", "ukoly", "načtení selhalo", { error: chyba });
  }

  const dnes = new Date().toISOString().slice(0, 10);
  const otevrene = ukoly.filter((u) => !u.hotovo);
  // Po termínu je jediná kategorie, která vyžaduje zásah dnes.
  const poTerminu = otevrene.filter((u) => u.termin && u.termin < dnes);
  const naDnes = otevrene.filter((u) => u.termin === dnes);

  return (
    <>
      <PageTitle
        title="Úkoly"
        lead="Co je potřeba udělat. Asistent sem umí zakládat úkoly přímo z rozhovoru."
      />

      {chyba ? (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Tabulka úkolů zatím neexistuje.</span>{" "}
            <span className="adm-alert__detail">Spusť supabase/ukoly.sql.</span>
          </span>
        </div>
      ) : (
        <>
          <div className="adm-cards">
            <Stat label="Otevřených" value={String(otevrene.length)} />
            <Stat label="Na dnešek" value={String(naDnes.length)} tone={naDnes.length ? "warn" : "neutral"} />
            <Stat label="Po termínu" value={String(poTerminu.length)} tone={poTerminu.length ? "bad" : "neutral"} />
            <Stat label="Hotových" value={String(ukoly.length - otevrene.length)} />
          </div>

          <div style={{ marginTop: 20 }}>
            {ukoly.length === 0 ? (
              <Panel
                title="Zatím žádné úkoly"
                lead="Zkus asistenta: „Založ úkol zavolat Procházkovi zítra“."
              >
                <span />
              </Panel>
            ) : (
              <UkolyPanel ukoly={ukoly} dnes={dnes} />
            )}
          </div>
        </>
      )}
    </>
  );
}
