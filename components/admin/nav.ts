export type Role = "client" | "manager" | "admin";

export type NavItem = { label: string; href: string; icon: string; roles: Role[] };
export type NavGroup = { title: string | null; items: NavItem[] };

const ALL: Role[] = ["client", "manager", "admin"];
const STAFF: Role[] = ["manager", "admin"];
const ADMIN: Role[] = ["admin"];

export const NAV: NavGroup[] = [
  {
    title: null,
    items: [{ label: "Přehled", href: "/dashboard", icon: "layout-dashboard", roles: ALL }],
  },
  {
    title: "Management",
    items: [
      { label: "Klienti", href: "/dashboard/klienti", icon: "users", roles: STAFF },
      { label: "Databáze kontaktů", href: "/dashboard/kontakty", icon: "address-book", roles: STAFF },
      { label: "Tipy", href: "/dashboard/tipy", icon: "ticket", roles: STAFF },
      { label: "Analytika", href: "/dashboard/analytika", icon: "chart-bar", roles: STAFF },
      { label: "Finance", href: "/dashboard/finance", icon: "cash", roles: ADMIN },
    ],
  },
  {
    title: "Operace",
    items: [
      { label: "Úkoly", href: "/dashboard/ukoly", icon: "checkbox", roles: STAFF },
      { label: "Support", href: "/dashboard/support", icon: "lifebuoy", roles: STAFF },
    ],
  },
  {
    title: "Automatizace",
    items: [
      { label: "Motor hodnoty", href: "/dashboard/motor", icon: "cpu", roles: STAFF },
      { label: "Automatizace", href: "/dashboard/automatizace", icon: "rotate-clockwise", roles: STAFF },
      { label: "Email a SMS", href: "/dashboard/komunikace", icon: "mail", roles: ADMIN },
    ],
  },
  {
    title: "Nastavení",
    items: [
      { label: "Nastavení", href: "/dashboard/nastaveni", icon: "settings", roles: ALL },
      { label: "Role", href: "/dashboard/role", icon: "shield-lock", roles: ADMIN },
      { label: "Audit log", href: "/dashboard/audit", icon: "history", roles: ADMIN },
    ],
  },
];

export const ROLE_LABEL: Record<Role, string> = {
  client: "Klient",
  manager: "Manažer",
  admin: "Super Admin",
};

/** Skupiny bez položek pro danou roli se vynechají celé. */
export function navFor(role: Role): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter(
    (g) => g.items.length > 0
  );
}
