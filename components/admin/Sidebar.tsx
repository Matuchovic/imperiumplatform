"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/brand/Logo";
import { VERZE } from "@/lib/verze";
import { navFor, bezpecnaRole, ROLE_LABEL, ROLE_BARVA, type Role } from "./nav";

export default function Sidebar({
  role,
  open,
  onClose,
}: {
  role: Role;
  open: boolean;
  onClose: () => void;
}) {
  const r = bezpecnaRole(role);
  const pathname = usePathname();
  const groups = navFor(r);

  return (
    <>
      {open && <div className="adm-scrim" onClick={onClose} aria-hidden="true" />}

      <aside className={`adm-side ${open ? "adm-side--open" : ""}`}>
        <div className="adm-side__brand">
          <Logo size={17} />
          {/* Zavírací křížek jen v zásuvce — na desktopu je panel trvalý. */}
          <button className="adm-side__close tap" onClick={onClose} aria-label="Zavřít menu">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
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
                    onClick={onClose}
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

        <div className="adm-side__foot">
          <span className="adm-side__role" style={{ color: ROLE_BARVA[r] }}>
            {ROLE_LABEL[r]}
          </span>
          <span className="data adm-side__verze" title="Verze aplikace">v{VERZE}</span>
        </div>
      </aside>
    </>
  );
}
