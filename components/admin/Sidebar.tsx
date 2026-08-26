"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/brand/Logo";
import { navFor, ROLE_LABEL, type Role } from "./nav";

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = navFor(role);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Zavřít menu" : "Otevřít menu"}
        className="adm-burger tap lg:hidden"
      >
        <i className={`ti ti-${open ? "x" : "menu-2"}`} aria-hidden="true" />
      </button>

      {open && <div className="adm-scrim lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`adm-side ${open ? "adm-side--open" : ""}`}>
        <div className="adm-side__brand">
          <Logo size={17} />
        </div>

        <nav className="adm-side__nav">
          {groups.map((g) => (
            <div key={g.title ?? "top"}>
              {g.title && <p className="adm-group">{g.title}</p>}
              {g.items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`adm-nav ${active ? "adm-nav--on" : ""}`}
                  >
                    <i className={`ti ti-${item.icon}`} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <p className="adm-side__role">{ROLE_LABEL[role]}</p>
      </aside>
    </>
  );
}
