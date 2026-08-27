import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { smiVstoupit } from "@/lib/vozidla/pristup";
import { PageTitle } from "@/components/admin/PageTitle";
import Info from "@/components/napoveda/Info";
import VozovyPark from "@/components/vozidla/VozovyPark";

export const dynamic = "force-dynamic";

export default async function Vozidla() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (!smiVstoupit(me.role)) redirect("/dashboard");

  const vedeni = me.role === "ceo" || me.role === "vyvojar";

  return (
    <>
      <PageTitle
        title="Vozový park"
        lead="Firemní vozidla, doklady a tankovací karty. Systém hlídá lhůty a upozorní, než propadnou."
      />

      {vedeni ? (
        <Info klic="vozidla-vedeni">
          <b>Spravujete vozidla a tankovací karty.</b> V záložce Vozidla přidáte auta,
          přiřadíte je lidem, vedete knihu jízd, servisní historii a fotodokumentaci
          poškození. Klepnutím na vozidlo otevřete jeho kartu se vším záznamem.
        </Info>
      ) : (
        <Info klic="vozidla-ridic">
          <b>Vidíte svá přiřazená vozidla a karty.</b> U vozidla najdete knihu jízd
          a jeho stav — jízdy si zapisujete sami. Poškození nebo závadu nahlaste vedení
          a zaznamenejte do fotodokumentace u daného auta.
        </Info>
      )}

      <VozovyPark jaId={me.id} />
    </>
  );
}
