/**
 * Smyšlené účty pro vývoj. Jména, e-maily i částky jsou vymyšlené —
 * nahradí je dotaz do Supabase, až bude tabulka klientů plněná.
 */

export type Tier = "BASIC" | "PREMIUM" | "VIP";
export type ClientState = "active" | "inactive" | "trial" | "cancelled";

export type Attention = { reason: string; tone: "bad" | "warn" | "good" } | null;

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: Tier;
  state: ClientState;
  registeredAt: string;
  expiresAt: string | null;
  expiresIn: number | null;
  paidTotal: number;
  lastLogin: string;
  manager: string;
  openTips: number;
  hitRate: number;
  profit: number;
  roi: number;
  tags: string[];
  note: string;
  attention: Attention;
};

export const CLIENTS: Client[] = [
  {
    id: "15328", name: "Jan Novák", email: "jan.novak@email.cz", phone: "+420 777 123 456",
    tier: "VIP", state: "active", registeredAt: "26. 7. 2026", expiresAt: "26. 8. 2026", expiresIn: 18,
    paidTotal: 14970, lastLogin: "dnes 20:15", manager: "Martin Kříž",
    openTips: 124, hitRate: 63.2, profit: 12430, roi: 18.4,
    tags: ["Dlouhodobý", "High value"],
    note: "VIP od začátku roku. Aktivní, pravidelně komunikuje.",
    attention: null,
  },
  {
    id: "15327", name: "Petr Svoboda", email: "petr.svoboda@email.cz", phone: "+420 606 884 210",
    tier: "PREMIUM", state: "active", registeredAt: "20. 7. 2026", expiresAt: "19. 8. 2026", expiresIn: 12,
    paidTotal: 9990, lastLogin: "dnes 18:02", manager: "Martin Kříž",
    openTips: 86, hitRate: 55.8, profit: -1840, roi: -3.1,
    tags: ["Rizikový"],
    note: "Po sérii proher zvýšil sázky. Domluveno snížení jednotky.",
    attention: { reason: "Zvýšil sázky po třech prohrách — 3 jed. místo 1,5", tone: "bad" },
  },
  {
    id: "15326", name: "Tomáš Dvořák", email: "tomas.dvorak@email.cz", phone: "+420 720 551 907",
    tier: "VIP", state: "active", registeredAt: "18. 7. 2026", expiresAt: "17. 8. 2026", expiresIn: 10,
    paidTotal: 14970, lastLogin: "včera 21:40", manager: "Petr Dvořák",
    openTips: 141, hitRate: 61.0, profit: 9120, roi: 11.7,
    tags: ["Dlouhodobý"],
    note: "Sází podle plánu, bez zásahů.",
    attention: null,
  },
  {
    id: "15325", name: "Michal Procházka", email: "michal.prochazka@email.cz", phone: "+420 733 002 118",
    tier: "BASIC", state: "active", registeredAt: "15. 7. 2026", expiresAt: "14. 8. 2026", expiresIn: 7,
    paidTotal: 4990, lastLogin: "dnes 09:12", manager: "Martin Kříž",
    openTips: 34, hitRate: 52.9, profit: -620, roi: -2.4,
    tags: ["Nový"],
    note: "Nováček, zatím bez polštáře. Hlídat propad.",
    attention: { reason: "Nový 19 dní · −11 % · nemá ještě polštář", tone: "warn" },
  },
  {
    id: "15324", name: "Martin Kovář", email: "martin.kovar@email.cz", phone: "+420 775 640 331",
    tier: "PREMIUM", state: "inactive", registeredAt: "10. 7. 2026", expiresAt: null, expiresIn: null,
    paidTotal: 9990, lastLogin: "před 9 dny", manager: "Petr Dvořák",
    openTips: 0, hitRate: 58.4, profit: 3210, roi: 6.8,
    tags: [],
    note: "Devět dní nevsadil. Členství končí příští týden.",
    attention: { reason: "9 dní nevsadil · členství končí za 6 dní", tone: "warn" },
  },
  {
    id: "15323", name: "Lukáš Bílek", email: "lukas.bilek@email.cz", phone: "+420 601 447 209",
    tier: "VIP", state: "trial", registeredAt: "8. 7. 2026", expiresAt: "5. 8. 2026", expiresIn: 0,
    paidTotal: 0, lastLogin: "dnes 07:55", manager: "Martin Kříž",
    openTips: 12, hitRate: 58.3, profit: 640, roi: 4.2,
    tags: ["Zkušební"],
    note: "Zkušební období vyprší dnes. Rozhodnout o nabídce.",
    attention: { reason: "Zkušební období vyprší dnes", tone: "warn" },
  },
  {
    id: "15322", name: "David Horák", email: "david.horak@email.cz", phone: "+420 728 315 604",
    tier: "PREMIUM", state: "active", registeredAt: "5. 7. 2026", expiresAt: "4. 8. 2026", expiresIn: -2,
    paidTotal: 9990, lastLogin: "před 3 dny", manager: "Petr Dvořák",
    openTips: 71, hitRate: 60.6, profit: 5480, roi: 9.9,
    tags: [],
    note: "Platba neprošla, expirovaná karta.",
    attention: { reason: "Platba neprošla — expirovaná karta", tone: "bad" },
  },
  {
    id: "15321", name: "Jakub Marek", email: "jakub.marek@email.cz", phone: "+420 792 118 043",
    tier: "VIP", state: "cancelled", registeredAt: "28. 6. 2026", expiresAt: "27. 7. 2026", expiresIn: null,
    paidTotal: 14970, lastLogin: "před 14 dny", manager: "Martin Kříž",
    openTips: 0, hitRate: 49.2, profit: -4300, roi: -8.6,
    tags: ["Odešel"],
    note: "Zrušil po ztrátovém měsíci. Důvod: nesplněná očekávání.",
    attention: null,
  },
  {
    id: "15320", name: "Marie Kučerová", email: "marie.kucerova@email.cz", phone: "+420 605 229 880",
    tier: "VIP", state: "active", registeredAt: "22. 6. 2026", expiresAt: "22. 8. 2026", expiresIn: 24,
    paidTotal: 22460, lastLogin: "dnes 07:31", manager: "Martin Kříž",
    openTips: 198, hitRate: 62.1, profit: 16800, roi: 15.2,
    tags: ["Dlouhodobý", "High value"],
    note: "Dosáhla cíle 50 000 Kč. Rozhodnout, co dál.",
    attention: { reason: "Dosáhla cíle 50 000 Kč — nabídnout vyšší metu", tone: "good" },
  },
  {
    id: "15319", name: "Eva Pospíšilová", email: "eva.pospisilova@email.cz", phone: "+420 776 903 512",
    tier: "PREMIUM", state: "active", registeredAt: "14. 6. 2026", expiresAt: "14. 9. 2026", expiresIn: 41,
    paidTotal: 19980, lastLogin: "včera 19:20", manager: "Petr Dvořák",
    openTips: 152, hitRate: 59.9, profit: 7340, roi: 8.8,
    tags: ["Dlouhodobý"],
    note: "Stabilní, bez zásahů.",
    attention: null,
  },
  {
    id: "15318", name: "Ondřej Fiala", email: "ondrej.fiala@email.cz", phone: "+420 739 664 127",
    tier: "BASIC", state: "active", registeredAt: "2. 6. 2026", expiresAt: "2. 9. 2026", expiresIn: 29,
    paidTotal: 9980, lastLogin: "dnes 12:44", manager: "Petr Dvořák",
    openTips: 64, hitRate: 54.7, profit: 1120, roi: 3.4,
    tags: [],
    note: "",
    attention: null,
  },
  {
    id: "15317", name: "Veronika Malá", email: "veronika.mala@email.cz", phone: "+420 608 771 350",
    tier: "PREMIUM", state: "inactive", registeredAt: "27. 5. 2026", expiresAt: null, expiresIn: null,
    paidTotal: 9990, lastLogin: "před 22 dny", manager: "Martin Kříž",
    openTips: 0, hitRate: 51.3, profit: -980, roi: -2.1,
    tags: [],
    note: "Neaktivní přes tři týdny.",
    attention: null,
  },
  {
    id: "15316", name: "Radek Beneš", email: "radek.benes@email.cz", phone: "+420 774 208 995",
    tier: "VIP", state: "active", registeredAt: "19. 5. 2026", expiresAt: "19. 8. 2026", expiresIn: 15,
    paidTotal: 29940, lastLogin: "dnes 16:08", manager: "Petr Dvořák",
    openTips: 231, hitRate: 60.2, profit: 21400, roi: 13.9,
    tags: ["Dlouhodobý", "High value"],
    note: "Nejdéle platící klient. Doporučil tři další.",
    attention: null,
  },
  {
    id: "15315", name: "Kateřina Urbanová", email: "katerina.urbanova@email.cz", phone: "+420 702 553 419",
    tier: "BASIC", state: "trial", registeredAt: "3. 8. 2026", expiresAt: "10. 8. 2026", expiresIn: 5,
    paidTotal: 0, lastLogin: "dnes 11:30", manager: "Martin Kříž",
    openTips: 6, hitRate: 50.0, profit: -180, roi: -1.5,
    tags: ["Zkušební", "Nový"],
    note: "",
    attention: null,
  },
];

export const TIER_STYLE: Record<Tier, { bg: string; fg: string }> = {
  BASIC: { bg: "rgba(143,163,150,0.14)", fg: "#9db3a5" },
  PREMIUM: { bg: "rgba(94,234,212,0.14)", fg: "#5eead4" },
  VIP: { bg: "rgba(126,240,168,0.14)", fg: "#7ef0a8" },
};

export const STATE_STYLE: Record<ClientState, { label: string; color: string }> = {
  active: { label: "Aktivní", color: "#7ef0a8" },
  inactive: { label: "Neaktivní", color: "#ffc94a" },
  trial: { label: "Zkušební", color: "#5eead4" },
  cancelled: { label: "Zrušený", color: "#ff6b6b" },
};

export const summary = () => {
  const total = CLIENTS.length;
  const active = CLIENTS.filter((c) => c.state === "active").length;
  const trial = CLIENTS.filter((c) => c.state === "trial").length;
  const inactive = CLIENTS.filter((c) => c.state === "inactive").length;
  const cancelled = CLIENTS.filter((c) => c.state === "cancelled").length;
  const paid = CLIENTS.reduce((s, c) => s + c.paidTotal, 0);
  return {
    total,
    active,
    trial,
    inactive,
    cancelled,
    ltv: Math.round(paid / total),
    needAttention: CLIENTS.filter((c) => c.attention).length,
  };
};
