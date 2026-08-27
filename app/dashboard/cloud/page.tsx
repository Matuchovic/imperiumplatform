import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { jeSprava, jeTym, type Role } from "@/components/admin/nav";
import { PageTitle } from "@/components/admin/PageTitle";
import CloudPanel from "@/components/cloud/CloudPanel";
import ZamekCloudu from "@/components/cloud/ZamekCloudu";
import Info from "@/components/napoveda/Info";

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

      <Info klic="cloud">
        <b>Koš zabírá místo dál.</b> Smazaný soubor zmizí z výpisu, ale v úložišti
        leží a poskytovatel ho účtuje. Trvale ho odstraní až správce z koše.
      </Info>
      <ZamekCloudu deti={<CloudPanel jeSpravce={jeSprava(me.role as Role)} />} />
    </>
  );
}
