import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { PageTitle } from "@/components/admin/PageTitle";
import BetmailPanel from "@/components/betmail/BetmailPanel";

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
      <BetmailPanel jaId={me.id} />
    </>
  );
}
