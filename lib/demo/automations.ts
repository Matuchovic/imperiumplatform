/**
 * Smyšlené automatizace pro vývoj. Nahradí je tabulka `automations`.
 *
 * Spouštěče jsou schválně psané jako konkrétní podmínky, ne jako skóre.
 * "Skóre > 70" nikdo neumí ověřit ani obhájit před klientem;
 * "propad nad 15 % a týden bez sázky" ano.
 */

export type Risk = "safe" | "money" | "betting";

export type Automation = {
  id: string;
  name: string;
  what: string;
  trigger: string;
  condition: string | null;
  actions: string[];
  active: boolean;
  lastRun: string;
  lastRunAgo: string;
  runs30d: number;
  okRate: number;
  risk: Risk;
  consent: boolean;
};

export const AUTOMATIONS: Automation[] = [
  {
    id: "a1",
    name: "Nová platba — aktivace členství",
    what: "Nastaví tarif a pošle uvítací e-mail.",
    trigger: "Platba prošla",
    condition: null,
    actions: ["Nastavit tarif", "Poslat e-mail", "Otevřít přístup"],
    active: true, lastRun: "dnes 14:32", lastRunAgo: "před 5 min",
    runs30d: 432, okRate: 99.2, risk: "money", consent: false,
  },
  {
    id: "a2",
    name: "Upozornění před koncem členství",
    what: "Tři dny před expirací pošle připomínku.",
    trigger: "Členství vyprší za 3 dny",
    condition: null,
    actions: ["Poslat e-mail", "Push"],
    active: true, lastRun: "dnes 11:05", lastRunAgo: "před 3 h",
    runs30d: 201, okRate: 98.8, risk: "safe", consent: false,
  },
  {
    id: "a3",
    name: "Nový tip — rozeslání",
    what: "Rozešle schválený tip a přidá ho do přehledu.",
    trigger: "Tip schválen manažerem",
    condition: "Kurz stále nad prahem hodnoty",
    actions: ["Push", "Telegram", "Zapsat tiket"],
    active: true, lastRun: "dnes 10:18", lastRunAgo: "před 3 h",
    runs30d: 310, okRate: 100, risk: "betting", consent: false,
  },
  {
    id: "a4",
    name: "Stažení tipu při ztrátě hodnoty",
    what: "Když kurz spadne pod práh, pošle „už neplatí“.",
    trigger: "Kurz klesl pod prahovou hodnotu",
    condition: "Tiket ještě není vyhodnocený",
    actions: ["Push", "Telegram", "Označit tiket"],
    active: true, lastRun: "dnes 09:47", lastRunAgo: "před 4 h",
    runs30d: 58, okRate: 100, risk: "betting", consent: false,
  },
  {
    id: "a5",
    name: "Denní report pro tým",
    what: "Každý den ve 20:00 shrne, co se stalo.",
    trigger: "Každý den 20:00",
    condition: null,
    actions: ["Sestavit report", "Poslat e-mail"],
    active: true, lastRun: "včera 20:00", lastRunAgo: "před 18 h",
    runs30d: 30, okRate: 100, risk: "safe", consent: false,
  },
  {
    id: "a6",
    name: "Klient v riziku odchodu",
    what: "Upozorní manažera, aby se ozval.",
    trigger: "Propad nad 15 % a 7 dní bez sázky",
    condition: "Členství je aktivní",
    actions: ["Vytvořit úkol", "Upozornit manažera"],
    active: true, lastRun: "26. 8. 09:12", lastRunAgo: "před 2 dny",
    runs30d: 41, okRate: 94.3, risk: "safe", consent: false,
  },
  {
    id: "a7",
    name: "Honění ztrát — zásah",
    what: "Když klient zvýší sázky po sérii proher, ozve se manažer.",
    trigger: "Tři prohry v řadě a sázka nad plán",
    condition: null,
    actions: ["Upozornit manažera", "Zapsat do složky klienta"],
    active: true, lastRun: "včera 18:22", lastRunAgo: "před 20 h",
    runs30d: 12, okRate: 100, risk: "safe", consent: false,
  },
  {
    id: "a8",
    name: "Neúspěšná platba — upozornění",
    what: "Pošle e-mail a založí úkol na support.",
    trigger: "Platba neprošla",
    condition: null,
    actions: ["Poslat e-mail", "Vytvořit úkol"],
    active: true, lastRun: "včera 13:47", lastRunAgo: "před 1 dnem",
    runs30d: 27, okRate: 97.1, risk: "money", consent: false,
  },
  {
    id: "a9",
    name: "Nabídka vyšší mety",
    what: "Klientovi po dosažení cíle nabídne pokračování.",
    trigger: "Klient dosáhl cílové částky",
    condition: null,
    actions: ["Poslat e-mail"],
    active: false, lastRun: "18. 8. 11:40", lastRunAgo: "před 8 dny",
    runs30d: 6, okRate: 100, risk: "safe", consent: true,
  },
  {
    id: "a10",
    name: "Reaktivace po odchodu",
    what: "Měsíc po zrušení pošle nabídku na návrat.",
    trigger: "30 dní od zrušení členství",
    condition: null,
    actions: ["Poslat e-mail"],
    active: false, lastRun: "—", lastRunAgo: "nikdy",
    runs30d: 0, okRate: 0, risk: "safe", consent: true,
  },
];

export const RISK_LABEL: Record<Risk, { label: string; color: string; bg: string }> = {
  safe: { label: "Bez rizika", color: "#8fa396", bg: "rgba(143,163,150,0.1)" },
  money: { label: "Sahá na peníze", color: "#ffc94a", bg: "rgba(255,201,74,0.1)" },
  betting: { label: "Odesílá tipy", color: "#5eead4", bg: "rgba(94,234,212,0.1)" },
};

export const TRIGGER_STATS = [
  { name: "Platba prošla", runs: 432, share: 29 },
  { name: "Tip schválen", runs: 310, share: 21 },
  { name: "Členství vyprší", runs: 201, share: 14 },
  { name: "Nová registrace", runs: 185, share: 13 },
  { name: "Členství vypršelo", runs: 143, share: 9 },
];

export const RECENT = [
  { name: "Nový tip — rozeslání", when: "dnes 10:18", ok: true },
  { name: "Nová platba — aktivace členství", when: "dnes 09:42", ok: true },
  { name: "Upozornění před koncem členství", when: "včera 11:05", ok: true },
  { name: "Klient v riziku odchodu", when: "včera 09:12", ok: false },
  { name: "Denní report pro tým", when: "včera 20:00", ok: true },
];

export const summary = () => {
  const active = AUTOMATIONS.filter((a) => a.active);
  const runs = AUTOMATIONS.reduce((s, a) => s + a.runs30d, 0);
  const weighted = AUTOMATIONS.reduce((s, a) => s + a.okRate * a.runs30d, 0);
  return {
    active: active.length,
    total: AUTOMATIONS.length,
    runs30d: runs,
    okRate: runs > 0 ? weighted / runs : 0,
    risky: AUTOMATIONS.filter((a) => a.active && a.risk !== "safe").length,
    failures: 2,
  };
};
