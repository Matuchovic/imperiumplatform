"use client";

import { useState } from "react";
import LogoutButton from "@/components/dashboard/LogoutButton";
import Logo from "@/components/brand/Logo";
import Avatar from "@/components/ui/Avatar";
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
  onMenu,
}: {
  name: string;
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

      <label className={`adm-search ${hledani ? "adm-search--open" : ""}`}>
        <i className="ti ti-search" aria-hidden="true" />
        <input type="search" placeholder="Hledat klienta, tip, platbu…" aria-label="Hledat" />
      </label>

      <button
        className="adm-top__find tap"
        onClick={() => setHledani((h) => !h)}
        aria-label={hledani ? "Zavřít hledání" : "Hledat"}
        aria-expanded={hledani}
      >
        <i className={`ti ti-${hledani ? "x" : "search"}`} aria-hidden="true" />
      </button>

      <span className="adm-user">
        <Avatar jmeno={name} velikost={30} />
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
