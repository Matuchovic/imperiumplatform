import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { jeSprava, type Role } from "@/components/admin/nav";
import { PageTitle } from "@/components/admin/PageTitle";
import Protokol from "@/components/apiklice/Protokol";

export const dynamic = "force-dynamic";

export default async function ProtokolStranka() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (!jeSprava(me.role as Role)) redirect("/dashboard");

  return (
    <>
      <PageTitle
        title="Protokol volání"
        lead="Co přesně přišlo, odkud a jak to dopadlo. Tady se pozná, proč formulář na webu nefunguje."
      />
      <Protokol />
    </>
  );
}
