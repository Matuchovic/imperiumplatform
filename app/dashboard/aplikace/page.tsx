import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { PageTitle } from "@/components/admin/PageTitle";
import NavodInstalace from "@/components/aplikace/NavodInstalace";

export const dynamic = "force-dynamic";

export default async function Aplikace() {
  const me = await roleOf();
  if (!me) redirect("/login");

  return (
    <>
      <PageTitle
        title="Aplikace na plochu"
        lead="BETIMPERIUM si můžete přidat na plochu telefonu i počítače. Otevře se jedním klepnutím, bez adresního řádku a bez hledání v záložkách."
      />
      <NavodInstalace />
    </>
  );
}
