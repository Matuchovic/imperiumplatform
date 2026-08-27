"use client";

import { useState } from "react";
import LogoutButton from "@/components/dashboard/LogoutButton";
import Logo from "@/components/brand/Logo";
import Avatar from "@/components/ui/Avatar";
import Hledani from "@/components/hledani/Hledani";
import Zvonecek from "@/components/lista/Zvonecek";
import Spotify from "@/components/lista/Spotify";
import Verze from "@/components/lista/Verze";
import KdoJeOnline from "@/components/pritomnost/KdoJeOnline";
import type { Efekt } from "@/lib/avatar";
import { bezpecnaRole, ROLE_LABEL, ROLE_BARVA, type Role } from "./nav";

/**
 * Horní lišta.
 *
 * Na telefonu nese značku a tlačítko menu, protože postranní panel
 * je schovaný — bez toho by na mobilu nebylo vidět, v jaké aplikaci
 * uživatel je. Hledání se tam schová pod ikonu; celé pole by vytlačilo
 * všechno ostatní.
 */
export default function Topbar({
  name,
  role,
  efekt = "zadny",
  jaId,
  onMenu,
  otevreneMenu = false,
}: {
  otevreneMenu?: boolean;
  jaId: string;
  name: string;
  efekt?: Efekt;
  role: Role;
  onMenu: () => void;
}) {
  const [hledani, setHledani] = useState(false);
  const r = bezpecnaRole(role);

  return (
    <header className="adm-top">
      {/* Hamburger. Tři čáry hoří — nestejně dlouhé a každá
          v jiné fázi, jinak by to blikalo jako dioda. */}
      <button
        className={`hb tap ${otevreneMenu ? "hb--on" : ""}`}
        onClick={onMenu}
        aria-label={otevreneMenu ? "Zavřít menu" : "Otevřít menu"}
        aria-expanded={otevreneMenu}
      >
        <span className="hb-cary" aria-hidden="true">
          <span className="hb-cara" />
          <span className="hb-cara" />
          <span className="hb-cara" />
        </span>
        <span className="hb-jiskra" style={{ ["--dx" as string]: "-4px", left: 12, top: 30 }} aria-hidden="true" />
        <span className="hb-jiskra" style={{ ["--dx" as string]: "6px", left: 26, top: 32, animationDelay: "-0.55s" }} aria-hidden="true" />
        <span className="hb-jiskra" style={{ ["--dx" as string]: "-2px", left: 20, top: 31, animationDelay: "-1.1s" }} aria-hidden="true" />
      </button>

      <span className="adm-top__brand">
        <Logo size={15} suffix={false} />
      </span>

      <div className={`adm-top__hledani ${hledani ? "adm-top__hledani--open" : ""}`}>
        <Hledani role={r} />
      </div>

      {/* Na telefonu se hledání schová pod ikonu — pole přes celou
          šířku by vytlačilo značku i jméno. */}
      <button
        className="adm-top__find tap"
        onClick={() => setHledani((h) => !h)}
        aria-label={hledani ? "Zavřít hledání" : "Hledat"}
        aria-expanded={hledani}
      >
        <i className={`ti ti-${hledani ? "x" : "search"}`} aria-hidden="true" />
      </button>

      {/* Nástroje vpravo. Na telefonu zůstane jen zvoneček —
          ostatní by vytlačily jméno i odhlášení. */}
      <span className="adm-nastroje">
        {/* Kdo je zrovna na platformě. Na užší obrazovce se schová. */}
        <span className="adm-online">
          <KdoJeOnline jaId={jaId} kompaktni />
        </span>
        <Verze />
        <Spotify />
        <Zvonecek />
      </span>

      <span className="adm-user">
        <Avatar jmeno={name} velikost={30} efekt={efekt} />
        <span className="adm-user__meta">
          <span className="adm-user__name">{name}</span>
          <span className="adm-user__role" style={{ color: ROLE_BARVA[r] }}>
            {ROLE_LABEL[r]}
          </span>
        </span>
      </span>

      <LogoutButton />
    </header>
  );
}
