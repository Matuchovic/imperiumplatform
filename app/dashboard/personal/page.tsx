import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { jeSprava, type Role } from "@/components/admin/nav";
import { PageTitle } from "@/components/admin/PageTitle";
import PersonalPanel, { type Clovek } from "@/components/personal/PersonalPanel";
import { log } from "@/lib/log";
import Info from "@/components/napoveda/Info";

export const dynamic = "force-dynamic";

export default async function Personal() {
  const me = await roleOf();
  if (!me) redirect("/login");
  // Pracovní údaje kolegů nejsou pro celý tým.
  if (!jeSprava(me.role as Role)) redirect("/dashboard");

  let lide: Clovek[] = [];
  let chyba = false;

  try {
    const db = serviceClient();
    const { data, error } = await db
      .from("profiles")
      .select("id, name, role, pozice, telefon, nastup, ukonceni, uvazek, poznamka_hr, avatar_efekt")
      .neq("role", "klient")
      .order("nastup", { ascending: true, nullsFirst: false });
    if (error) throw error;
    lide = (data ?? []) as Clovek[];
  } catch (err) {
    chyba = true;
    log("error", "personal", "načtení selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return (
    <>
      <PageTitle
        title="Personál"
        lead="Lidé ve firmě a jejich pracovní údaje. Oddělení se odvozuje z role — nevyplňuje se zvlášť, aby si to nemohlo odporovat."
      />

      <Info klic="personal">
        <b>Oddělení se odvozuje z role.</b> Nevyplňuje se zvlášť, aby si to nemohlo
        odporovat. Vyplněné ukončení člověka nemaže — přesune ho mezi bývalé
        a přístup se odebírá zvlášť v sekci Role.
      </Info>

      {chyba ? (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Načtení selhalo.</span>{" "}
            <span className="adm-alert__detail">Spustil jsi supabase/personal.sql?</span>
          </span>
        </div>
      ) : (
        <PersonalPanel lide={lide} />
      )}
    </>
  );
}
