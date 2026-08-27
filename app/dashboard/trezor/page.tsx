import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { jeSprava, type Role } from "@/components/admin/nav";
import { trezorPripraven } from "@/lib/trezor/sifra";
import { PageTitle } from "@/components/admin/PageTitle";
import TrezorPanel from "@/components/trezor/TrezorPanel";

export const dynamic = "force-dynamic";

export default async function Trezor() {
  const me = await roleOf();
  if (!me) redirect("/login");
  // Trezor vidí jen správci. Hesla ke službám nepotřebuje celý tým.
  if (!jeSprava(me.role as Role)) redirect("/dashboard");

  const pripraven = trezorPripraven();

  return (
    <>
      <PageTitle
        title="Trezor"
        lead="Hesla a klíče ke službám. Hodnoty jsou šifrované klíčem z prostředí — únik databáze sám o sobě nic neodhalí."
      />

      {!pripraven ? (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Trezor není nastavený.</span>{" "}
            <span className="adm-alert__detail">
              Doplň ve Vercelu proměnnou <span className="data">TREZOR_KLIC</span> — libovolné
              tajemství alespoň 32 znaků. Bez něj se hesla nedají uložit ani přečíst.
            </span>
          </span>
        </div>
      ) : (
        <TrezorPanel jeSpravce />
      )}
    </>
  );
}
