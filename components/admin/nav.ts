export type Role =
  | "ceo"
  | "vyvojar"
  | "manazer"
  | "marketing"
  | "scout"
  | "ucetni"
  | "klient";

export type NavItem = { label: string; href: string; icon: string; roles: Role[] };
export type NavGroup = { title: string | null; items: NavItem[] };

/**
 * Role není štítek — určuje, co člověk vidí a smí.
 *
 * Rozdělení podle toho, co kdo skutečně potřebuje: Marketing rozesílá,
 * takže nepotřebuje vidět bankrolly klientů. Účetní řeší peníze, ne
 * sázky. Scout pracuje jen s databází firem.
 */
const VSICHNI: Role[] = ["ceo", "vyvojar", "manazer", "marketing", "scout", "ucetni", "klient"];
const TYM: Role[] = ["ceo", "vyvojar", "manazer", "marketing", "scout", "ucetni"];
const SPRAVA: Role[] = ["ceo", "vyvojar"];

export const NAV: NavGroup[] = [
  {
    title: null,
    items: [{ label: "Přehled", href: "/dashboard", icon: "layout-dashboard", roles: VSICHNI }],
  },
  {
    title: "Management",
    items: [
      { label: "Klienti", href: "/dashboard/klienti", icon: "users",
        roles: ["ceo", "vyvojar", "manazer"] },
      { label: "Personál", href: "/dashboard/personal", icon: "id-badge", roles: SPRAVA },
      { label: "Databáze kontaktů", href: "/dashboard/kontakty", icon: "address-book",
        roles: ["ceo", "vyvojar", "marketing", "scout"] },
      { label: "Analytika", href: "/dashboard/analytika", icon: "chart-bar",
        roles: ["ceo", "vyvojar", "manazer", "marketing", "ucetni"] },
    ],
  },
  {
    title: "Operace",
    items: [
      { label: "Úkoly", href: "/dashboard/ukoly", icon: "checkbox",
        roles: ["ceo", "vyvojar", "manazer", "marketing", "scout"] },
      { label: "Support", href: "/dashboard/support", icon: "lifebuoy",
        roles: ["ceo", "vyvojar", "manazer", "marketing"] },
      { label: "Týmový chat", href: "/dashboard/chat", icon: "message-circle",
        roles: TYM },
      { label: "Betmail", href: "/dashboard/betmail", icon: "mail", roles: TYM },
      { label: "Cloud", href: "/dashboard/cloud", icon: "cloud", roles: TYM },
      { label: "Vozový park", href: "/dashboard/vozidla", icon: "car", roles: TYM },
    ],
  },
  {
    title: "Automatizace",
    items: [
      { label: "Automatizace", href: "/dashboard/automatizace", icon: "rotate-clockwise",
        roles: SPRAVA },
      { label: "Email a SMS", href: "/dashboard/komunikace", icon: "mail",
        roles: ["ceo", "vyvojar", "marketing"] },
    ],
  },
  {
    title: "Nastavení",
    items: [
      { label: "Nastavení", href: "/dashboard/nastaveni", icon: "settings",
        roles: ["ceo", "vyvojar", "klient"] },
      { label: "Notifikace", href: "/dashboard/notifikace", icon: "bell", roles: VSICHNI },
      { label: "Aplikace na plochu", href: "/dashboard/aplikace", icon: "device-mobile-plus",
        roles: VSICHNI },
      { label: "Trezor", href: "/dashboard/trezor", icon: "lock", roles: SPRAVA },
      { label: "Role", href: "/dashboard/role", icon: "shield-lock", roles: SPRAVA },
      { label: "Bezpečnost", href: "/dashboard/bezpecnost", icon: "shield-lock",
        roles: SPRAVA },
      { label: "Audit log", href: "/dashboard/audit", icon: "history",
        roles: ["ceo", "vyvojar", "ucetni"] },
    ],
  },
];

export const ROLE_LABEL: Record<Role, string> = {
  ceo: "CEO",
  vyvojar: "Vývojář",
  manazer: "Manažer",
  marketing: "Marketing",
  scout: "Scout",
  ucetni: "Účetní",
  klient: "Klient",
};

/**
 * Barva role. Jedna pro všechny — signální zelená z palety.
 *
 * Zkoušel jsem odlišit role barvami, ale v rozhraní, kde zelená znamená
 * „v pořádku" a jantarová „pozor", by fialový nebo modrý štítek říkal
 * něco, co neplatí. Role rozlišuje text, ne barva.
 */
export const ROLE_BARVA_JEDNOTNA = "#7ef0a8";

export const ROLE_BARVA: Record<Role, string> = {
  ceo: ROLE_BARVA_JEDNOTNA,
  vyvojar: ROLE_BARVA_JEDNOTNA,
  manazer: ROLE_BARVA_JEDNOTNA,
  marketing: ROLE_BARVA_JEDNOTNA,
  scout: ROLE_BARVA_JEDNOTNA,
  ucetni: ROLE_BARVA_JEDNOTNA,
  klient: ROLE_BARVA_JEDNOTNA,
};

export const ROLE_PORADI: Role[] = VSICHNI;

/** Kdo smí měnit role a nastavení. */
export const jeSprava = (r: Role) => SPRAVA.includes(r);
/** Kdo patří do týmu, tedy není klient. */
export const jeTym = (r: Role) => TYM.includes(r);

/** Skupiny bez položek pro danou roli se vynechají celé. */
/**
 * Neznámá role z databáze nesmí rozhodení UI způsobit pád ani prázdné
 * menu. Stane se z ní klient — nejmenší možná práva.
 */
export function bezpecnaRole(role: string | null | undefined): Role {
  return (role && role in ROLE_LABEL ? role : "klient") as Role;
}

export function navFor(vstup: Role | string): NavGroup[] {
  const role = bezpecnaRole(vstup);
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);
}
