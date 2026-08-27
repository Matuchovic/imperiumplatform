import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { PageTitle } from "@/components/admin/PageTitle";
import VizePanel from "@/components/vize/VizePanel";

export const dynamic = "force-dynamic";

export default async function Vize() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (!jeTym(me.role as Role)) redirect("/dashboard");

  return (
    <>
      <PageTitle
        title="Vize"
        lead="Proč jsem tenhle systém postavil, co je a co není, a kam by mohl mířit."
      />
      <VizePanel />
    </>
  );
}
