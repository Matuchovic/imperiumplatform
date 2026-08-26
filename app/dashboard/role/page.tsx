import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { jeSprava, type Role } from "@/components/admin/nav";
import { PageTitle } from "@/components/admin/PageTitle";
import RolePanel, { type Clen } from "@/components/admin/RolePanel";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function RolePage() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (!jeSprava(me.role as Role)) redirect("/dashboard");

  let tym: Clen[] = [];
  let chyba = false;

  try {
    const db = serviceClient();
    const { data, error } = await db
      .from("profiles")
      .select("id, name, role, created_at")
      .neq("role", "klient")
      .order("created_at");
    if (error) throw error;

    tym = (data ?? []).map((p) => ({
      id: p.id as string,
      name: (p.name as string) || "Bez jména",
      role: p.role as Role,
    }));
  } catch (err) {
    chyba = true;
    log("error", "role", "načtení týmu selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return (
    <>
      <PageTitle
        title="Role"
        lead="Role není štítek — určuje, co člověk v systému vidí a smí. Změna platí okamžitě a zapíše se do auditu."
      />

      {chyba ? (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Načtení týmu selhalo.</span>{" "}
            <span className="adm-alert__detail">Spustil jsi supabase/role.sql?</span>
          </span>
        </div>
      ) : (
        <RolePanel tym={tym} jaId={me.id} />
      )}
    </>
  );
}
