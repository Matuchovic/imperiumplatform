import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { jeSprava, type Role } from "@/components/admin/nav";
import { PageTitle } from "@/components/admin/PageTitle";
import Info from "@/components/napoveda/Info";
import Garaz from "@/components/agenti/Garaz";

export const dynamic = "force-dynamic";

export default async function Agenti() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (!jeSprava(me.role as Role)) redirect("/dashboard");

  return (
    <>
      <PageTitle
        title="AI Agent Garáž"
        lead="Agenti, kteří pracují na pozadí. Každý má ruční brzdu — nic rizikového neudělá bez schválení."
      />

      <Info klic="agenti">
        <b>Agent nikdy nejedná sám.</b> Připraví návrh a čeká, až ho někdo odklepne.
        Čím víc toho udělá bez dotazu, tím důležitější je, aby seznam zakázaných
        operací zůstal krátký a nepřekročitelný.
      </Info>

      <Garaz />
    </>
  );
}
