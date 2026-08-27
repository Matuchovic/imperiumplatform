import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { PageTitle } from "@/components/admin/PageTitle";
import BetmailPanel from "@/components/betmail/BetmailPanel";
import Info from "@/components/napoveda/Info";

export const dynamic = "force-dynamic";

export default async function Betmail() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (!jeTym(me.role as Role)) redirect("/dashboard");

  return (
    <>
      <PageTitle
        title="Betmail"
        lead="Interní pošta pro věci, které mají zůstat dohledatelné. Na rozdíl od chatu se tu nic neztratí."
      />

      <Info klic="betmail">
        <b>Přílohy se berou z cloudu.</b> Nahraný soubor jde rovnou tam, takže tatáž
        smlouva neleží na dvou místech. Příjemce ji otevře přímo ve zprávě —
        PDF, obrázky i tabulky.
      </Info>
      <BetmailPanel jaId={me.id} />
    </>
  );
}
