import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { jeSprava, jeTym, type Role } from "@/components/admin/nav";
import { PageTitle } from "@/components/admin/PageTitle";
import CloudPanel from "@/components/cloud/CloudPanel";
import ZamekCloudu from "@/components/cloud/ZamekCloudu";

export const dynamic = "force-dynamic";

export default async function Cloud() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (!jeTym(me.role as Role)) redirect("/dashboard");

  return (
    <>
      <PageTitle
        title="Cloud"
        lead="Smlouvy, faktury a doklady. Úložiště je privátní — soubory se otvírají přes dočasné odkazy, ne veřejnou adresou."
      />
      <ZamekCloudu deti={<CloudPanel jeSpravce={jeSprava(me.role as Role)} />} />
    </>
  );
}
