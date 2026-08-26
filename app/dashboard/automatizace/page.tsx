import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { PageTitle } from "@/components/admin/PageTitle";
import { Stat } from "@/components/admin/ui";
import AutomationsPanel from "@/components/admin/AutomationsPanel";
import { summary } from "@/lib/demo/automations";

export const dynamic = "force-dynamic";

export default async function Automatizace() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (me.role === "client") redirect("/dashboard");

  const s = summary();

  return (
    <>
      <PageTitle
        title="Automatizace"
        lead="Co se v systému děje samo. U každé je vidět, co ji spustí a co pak provede — beze jmen podmínek, které nikdo neumí ověřit."
      />

      <div className="adm-cards">
        <Stat label="Zapnutých" value={String(s.active)} note={`z ${s.total} celkem`} />
        <Stat label="Spuštění za 30 dní" value={s.runs30d.toLocaleString("cs-CZ")} />
        <Stat
          label="Úspěšně doběhlo"
          value={s.okRate.toFixed(1).replace(".", ",")}
          unit="%"
          note="běhy automatizací, ne úspěšnost tipů"
        />
        <Stat
          label="Sahá na peníze nebo tipy"
          value={String(s.risky)}
          note="vyžadují potvrzení při zapnutí"
          tone="warn"
        />
      </div>

      <AutomationsPanel />

      <p className="adm-todo__note" style={{ marginTop: 20 }}>
        Automatizace jsou zatím ukázkové. Nahradí je tabulka <span className="data">automations</span>,
        která je v databázovém skriptu už připravená.
      </p>
    </>
  );
}
