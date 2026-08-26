import { PageTitle } from "@/components/admin/PageTitle";
import { Stat } from "@/components/admin/ui";
import ClientsTable from "@/components/admin/ClientsTable";
import { summary } from "@/lib/demo/clients";

export const dynamic = "force-dynamic";

export default function Klienti() {
  const s = summary();

  return (
    <>
      <PageTitle
        title="Klienti"
        lead="Seznam se otevírá na těch, kdo dnes potřebují zásah. Ostatní se dají dohledat filtrem."
      />

      <div className="adm-cards">
        <Stat label="Klientů celkem" value={String(s.total)} note="demo účty" />
        <Stat label="Platí" value={String(s.active)} note={`${s.trial} ve zkušební době`} tone="good" />
        <Stat label="Potřebují pozornost" value={String(s.needAttention)} note="podle triáže" tone="warn" />
        <Stat label="Průměrně zaplaceno" value={s.ltv.toLocaleString("cs-CZ")} unit="Kč" note="na klienta" />
      </div>

      <div style={{ marginTop: 20 }}>
        <ClientsTable />
      </div>

      <p className="adm-todo__note" style={{ marginTop: 20 }}>
        Účty jsou smyšlené. Nahradí je dotaz do Supabase, jakmile bude tabulka klientů plněná.
      </p>
    </>
  );
}
