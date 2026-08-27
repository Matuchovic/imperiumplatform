import { redirect } from "next/navigation";
import { currentUser, serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { PageTitle } from "@/components/admin/PageTitle";
import { VERZE, VERZE_POPIS } from "@/lib/verze";
import { jeSprava, ROLE_LABEL, type Role } from "@/components/admin/nav";
import SettingsPanel, { type Settings } from "@/components/admin/SettingsPanel";
import { Row } from "@/components/admin/ui";
import IntegracePanel from "@/components/admin/IntegracePanel";

export const dynamic = "force-dynamic";

const FALLBACK: Settings = {
  platform_name: "BETIMPERIUM", tagline: "", description: "",
  language: "cs", currency: "CZK", timezone: "Europe/Prague", week_start: "monday",
  allow_signup: true, allow_trial: true, approve_clients: false, require_2fa_staff: true,
  default_units: 2, default_sport: "fotbal", tip_expiry_minutes: 120,
  default_week_limit: 6000, default_loss_limit: 8000, reality_check_min: 60,
  retention_days: 730,
};

export default async function Nastaveni() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const me = await roleOf();

  if (!me || !jeSprava(me.role as Role)) {
    return (
      <>
        <PageTitle title="Nastavení" lead="Tvůj účet a limity zodpovědného sázení." />
        <div className="adm-panel">
          <p className="adm-panel__title">Účet</p>
          <div style={{ marginTop: 10 }}>
            <Row label="E-mail" value={user.email ?? ""} />
            <Row label="Role" value={ROLE_LABEL[(me?.role ?? "klient") as Role]} />
          </div>
        </div>
        <div className="adm-panel">
          <p className="adm-panel__title">Nastavení systému</p>
          <p className="adm-panel__lead" style={{ marginBottom: 0 }}>
            Sem má přístup jen administrátor.
          </p>
        </div>
      </>
    );
  }

  let settings = FALLBACK;
  let dbError: string | null = null;
  try {
    const { data, error } = await serviceClient()
      .from("app_settings").select("*").eq("id", true).single();
    if (error) dbError = error.message;
    else if (data) settings = { ...FALLBACK, ...(data as Partial<Settings>) };
  } catch (err) {
    dbError = String(err);
  }

  return (
    <>
      <PageTitle
        title="Nastavení"
        lead="Chování systému, výchozí hodnoty tipů a ochrana hráčů. Změny platí pro celou platformu."
      />

      {dbError && (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Tabulka nastavení chybí.</span>{" "}
            <span className="adm-alert__detail">
              Spusť supabase/settings.sql. Zatím se zobrazují výchozí hodnoty a uložení neprojde.
            </span>
          </span>
        </div>
      )}

      <SettingsPanel initial={settings} />

      <IntegracePanel />

      <div className="adm-panel">
        <p className="adm-panel__title">O aplikaci</p>
        <div style={{ marginTop: 10 }}>
          <Row label="Verze" value={`v${VERZE}`} />
          <Row label="Poslední změna" value={VERZE_POPIS} />
        </div>
      </div>
    </>
  );
}
