import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { Stat } from "@/components/admin/ui";
import KontaktyTable, { type Kontakt } from "@/components/admin/KontaktyTable";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

const PAGE = 30;

export default async function Kontakty({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; obor?: string; mesto?: string }>;
}) {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (me.role === "client") redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const q = (sp.q ?? "").trim();
  const obor = (sp.obor ?? "").trim();
  const mesto = (sp.mesto ?? "").trim();

  let rows: Kontakt[] = [];
  let total = 0;
  let obory: string[] = [];
  let chyba: string | null = null;

  try {
    const db = serviceClient();

    let dotaz = db
      .from("kontakty")
      .select("id, company_name, ico, industry, city, address, website, email, phone, status, ucel", { count: "exact" })
      .order("company_name")
      .range((page - 1) * PAGE, page * PAGE - 1);

    // Filtrování i stránkování na serveru. Načíst 22 000 řádků do
    // prohlížeče a filtrovat tam by stránku položilo.
    if (q) dotaz = dotaz.or(`company_name.ilike.%${q}%,ico.ilike.%${q}%,email.ilike.%${q}%`);
    if (obor) dotaz = dotaz.eq("industry", obor);
    if (mesto) dotaz = dotaz.ilike("city", `%${mesto}%`);

    const { data, count, error } = await dotaz;
    if (error) throw error;

    total = count ?? 0;
    rows = (data ?? []) as Kontakt[];

    const { data: o } = await db.from("kontakty").select("industry").limit(2000);
    obory = [...new Set((o ?? []).map((r) => r.industry as string).filter(Boolean))].sort();
  } catch (err) {
    chyba = err instanceof Error ? err.message : String(err);
    log("error", "kontakty", "načtení selhalo", { error: chyba });
  }

  return (
    <>
      <PageTitle
        title="Databáze kontaktů"
        lead="Firemní rejstřík z ARES. Slouží jako interní evidence — nic se odsud samo nerozesílá."
      />

      {chyba ? (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Tabulka kontaktů zatím neexistuje.</span>{" "}
            <span className="adm-alert__detail">
              Spusť supabase/kontakty.sql a nahraj CSV export ze scout_leads.
            </span>
          </span>
        </div>
      ) : (
        <>
          <div className="adm-cards">
            <Stat label="Kontaktů celkem" value={total.toLocaleString("cs-CZ")} />
            <Stat label="Oborů" value={String(obory.length)} />
            <Stat label="Na této stránce" value={String(rows.length)} note={`strana ${page}`} />
          </div>

          <div style={{ marginTop: 20 }}>
            <KontaktyTable
              rows={rows}
              page={page}
              pageSize={PAGE}
              total={total}
              q={q}
              obor={obor}
              mesto={mesto}
              obory={obory}
            />
          </div>
        </>
      )}
    </>
  );
}
