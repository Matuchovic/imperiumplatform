import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { PageTitle } from "@/components/admin/PageTitle";
import Info from "@/components/napoveda/Info";
import VyplatyPanel from "@/components/vyplaty/VyplatyPanel";

export const dynamic = "force-dynamic";

export default async function Vyplaty() {
  const me = await roleOf();
  if (!me) redirect("/login");
  // Mzdy kolegů nejsou pro celý tým.
  if (!["ceo", "vyvojar", "ucetni"].includes(me.role)) redirect("/dashboard");

  return (
    <>
      <PageTitle
        title="Výplaty"
        lead="Přehled mezd po měsících. Hodiny a částky se zapisují ručně, systém spočítá hrubou mzdu a co zbývá k výplatě."
      />

      <Info klic="vyplaty" tón="pozor">
        <b>Daně a odvody systém nepočítá.</b> Spočítá hrubou mzdu, srážky a zálohy —
        čistou částku doplní účetní. Chybný výpočet odvodů je odpovědnost firmy,
        ne systému, a odhadovat ho by bylo nebezpečné.
      </Info>

      <VyplatyPanel jeSpravce={me.role === "ceo" || me.role === "vyvojar"} />
    </>
  );
}
