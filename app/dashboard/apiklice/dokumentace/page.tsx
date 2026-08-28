import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { jeSprava, type Role } from "@/components/admin/nav";
import { PageTitle } from "@/components/admin/PageTitle";
import Dokumentace from "@/components/apiklice/Dokumentace";

export const dynamic = "force-dynamic";

export default async function Dokument() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (!jeSprava(me.role as Role)) redirect("/dashboard");

  return (
    <>
      <PageTitle
        title="Dokumentace API"
        lead="Co posílat, kam a co přijde zpátky. Určeno pro toho, kdo dělá web."
      />
      <Dokumentace />
    </>
  );
}
