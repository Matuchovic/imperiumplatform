import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { PageTitle } from "@/components/admin/PageTitle";
import Info from "@/components/napoveda/Info";
import FakturyPanel from "@/components/faktury/FakturyPanel";

export const dynamic = "force-dynamic";

export default async function Faktury() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (!["ceo", "vyvojar", "ucetni", "manazer"].includes(me.role)) redirect("/dashboard");

  return (
    <>
      <PageTitle
        title="Faktury"
        lead="Vystavování, hlídání splatnosti a upomínky. Na každé faktuře je QR platba — klient nemusí nic opisovat."
      />

      <Info klic="faktury" tón="pozor">
        <b>Vystavenou fakturu nelze upravit ani smazat.</b> Je to daňový doklad
        a řada čísel nesmí mít mezery. Opravu řeší storno a nová faktura.
        Dokud je faktura koncept, měnit se dá.
      </Info>

      <FakturyPanel jeSpravce={me.role === "ceo" || me.role === "vyvojar"} />
    </>
  );
}
