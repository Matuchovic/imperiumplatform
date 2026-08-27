import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { PageTitle } from "@/components/admin/PageTitle";
import NotifikacePanel from "@/components/notifikace/NotifikacePanel";
import Info from "@/components/napoveda/Info";
import Zvuky from "@/components/notifikace/Zvuky";

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

      <Info klic="notifikace">
        <b>Na iPhonu je potřeba aplikaci nejdřív přidat na plochu.</b> Ze Safari
        notifikace nechodí — je to omezení systému, ne nastavení. Povolení se navíc
        dává na každém zařízení zvlášť.
      </Info>
      <NotifikacePanel />

      <Zvuky />
    </>
  );
}
