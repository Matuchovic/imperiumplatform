import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { jeSprava, type Role } from "@/components/admin/nav";
import { PageTitle } from "@/components/admin/PageTitle";
import Info from "@/components/napoveda/Info";
import KlicePanel from "@/components/apiklice/KlicePanel";

export const dynamic = "force-dynamic";

export default async function ApiKlice() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (!jeSprava(me.role as Role)) redirect("/dashboard");

  return (
    <>
      <PageTitle
        title="API klíče"
        lead="Klíčem se web napojí na systém. Každý má vlastní oprávnění a doménu — jeden uniklý klíč nesmí otevřít všechno."
      />

      <Info klic="apiklice" tón="pozor">
        <b>Klíč uvidíš jen jednou.</b> Do databáze jde pouze jeho otisk, takže
        ho podruhé nezobrazí nikdo — ani já, ani ty. Když ho ztratíš, nedá se
        obnovit, jen vyměnit za nový.
      </Info>

      <KlicePanel />
    </>
  );
}
