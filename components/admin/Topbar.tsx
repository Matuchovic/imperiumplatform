"use client";

import { useState } from "react";
import LogoutButton from "@/components/dashboard/LogoutButton";
import Logo from "@/components/brand/Logo";
import Avatar from "@/components/ui/Avatar";
import Hledani from "@/components/hledani/Hledani";
import Zvonecek from "@/components/lista/Zvonecek";
import Spotify from "@/components/lista/Spotify";
import Verze from "@/components/lista/Verze";
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
  onMenu,
}: {
  name: string;
  efekt?: Efekt;
  role: Role;
  onMenu: () => void;
}) {
  const [hledani, setHledani] = useState(false);
  const r = bezpecnaRole(role);

  return (
    <header className="adm-top">
      <button className="adm-top__menu tap" onClick={onMenu} aria-label="Otevřít menu">
        <i className="ti ti-menu-2" aria-hidden="true" />
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
