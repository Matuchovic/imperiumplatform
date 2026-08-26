import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { automationSummary } from "@/lib/automations/engine";
import { flags } from "@/lib/flags";
import { PageTitle } from "@/components/admin/PageTitle";
import { Stat, Panel } from "@/components/admin/ui";
import AutomationsPanel from "@/components/admin/AutomationsPanel";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function Automatizace() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (me.role === "client") redirect("/dashboard");

  let data: Awaited<ReturnType<typeof automationSummary>> | null = null;
  let enabled = false;

  try {
    [data, enabled] = await Promise.all([
      automationSummary(),
      flags().then((f) => f.automations_enabled),
    ]);
  } catch (err) {
    log("error", "automatizace", "načtení selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const list = data?.automations ?? [];
  const risky = list.filter((a) => a.active && a.risk !== "safe").length;

  return (
    <>
      <PageTitle
        title="Automatizace"
        lead="Co se v systému děje samo. Spouštěč je konkrétní událost, ne skóre — u každé je vidět, co ji vyvolá a co pak provede."
      />

      <div className="adm-cards">
        <Stat
          label="Zapnutých"
          value={String(list.filter((a) => a.active).length)}
          note={`z ${list.length} celkem`}
        />
        <Stat label="Běhů za 30 dní" value={String(data?.runs30d ?? 0)} />
        <Stat
          label="Selhalo"
          value={String(data?.failed ?? 0)}
          tone={(data?.failed ?? 0) > 0 ? "bad" : "neutral"}
        />
        <Stat
          label="Sahá na peníze nebo tipy"
          value={String(risky)}
          note="vyžadují schválení"
          tone={risky > 0 ? "warn" : "neutral"}
        />
      </div>

      {list.length === 0 ? (
        <Panel
          title="Zatím žádné automatizace"
          lead="Jakmile nějakou založíš, objeví se tady i s historií běhů. Ukázkové se nedoplňují."
        >
          <span />
        </Panel>
      ) : (
        <AutomationsPanel automations={list} enabled={enabled} />
      )}

      <p className="adm-todo__note" style={{ marginTop: 20 }}>
        Engine čte doménové události a je idempotentní — tatáž událost akci
        nespustí dvakrát. Rizikové akce čekají na schválení bez ohledu na to,
        jestli jsou automatizace zapnuté.
      </p>
    </>
  );
}
