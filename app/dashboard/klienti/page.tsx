import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { serviceClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { Stat } from "@/components/admin/ui";
import ClientsTable, { type ClientRow } from "@/components/admin/ClientsTable";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function Klienti({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (me.role === "client") redirect("/dashboard");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const q = (params.q ?? "").trim();

  let rows: ClientRow[] = [];
  let total = 0;
  let failed = false;

  try {
    const db = serviceClient();

    // Filtrování i stránkování na serveru. Načíst všechny klienty
    // a filtrovat v prohlížeči by při tisících účtech neprošlo.
    let query = db
      .from("profiles")
      .select("id, name, plan, role, bankroll, subscribed_bands, telegram_chat_id, created_at", {
        count: "exact",
      })
      .eq("role", "client")
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (q) query = query.ilike("name", `%${q}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    total = count ?? 0;
    rows = (data ?? []).map((p) => ({
      id: p.id as string,
      name: (p.name as string) || "Bez jména",
      plan: (p.plan as string) ?? "start",
      bankroll: Number(p.bankroll ?? 0),
      bands: (p.subscribed_bands as string[]) ?? [],
      telegram: Boolean(p.telegram_chat_id),
      createdAt: p.created_at as string,
    }));
  } catch (err) {
    failed = true;
    log("error", "klienti", "načtení klientů selhalo", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const withTelegram = rows.filter((r) => r.telegram).length;

  return (
    <>
      <PageTitle
        title="Klienti"
        lead="Skutečné účty z databáze. Bez klientů zůstane seznam prázdný — ukázkové účty tu nejsou."
      />

      {failed ? (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Načtení klientů selhalo.</span>{" "}
            <span className="adm-alert__detail">Zkus stránku načíst znovu.</span>
          </span>
        </div>
      ) : (
        <>
          <div className="adm-cards">
            <Stat label="Klientů celkem" value={String(total)} />
            <Stat label="Na této stránce" value={String(rows.length)} note={`strana ${page}`} />
            <Stat
              label="S napojeným Telegramem"
              value={String(withTelegram)}
              note={rows.length ? `z ${rows.length}` : undefined}
              tone={withTelegram === rows.length && rows.length > 0 ? "good" : "warn"}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <ClientsTable rows={rows} page={page} pageSize={PAGE_SIZE} total={total} query={q} />
          </div>
        </>
      )}
    </>
  );
}
