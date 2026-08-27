import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { PageTitle } from "@/components/admin/PageTitle";
import NotifikacePanel from "@/components/notifikace/NotifikacePanel";

export const dynamic = "force-dynamic";

export default async function Notifikace() {
  const me = await roleOf();
  if (!me) redirect("/login");

  return (
    <>
      <PageTitle
        title="Notifikace"
        lead="Co má dorazit na telefon a počítač, i když aplikaci nemáte otevřenou."
      />
      <NotifikacePanel />
    </>
  );
}
