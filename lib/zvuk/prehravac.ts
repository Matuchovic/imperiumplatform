import { MELODIE, VIBRACE, type Druh } from "./tony";

/**
 * Přehrávání zvuků a vibrace.
 *
 * Zvuk se skládá ve Web Audio, ne z nahrávky — žádný soubor
 * ke stažení a stejný výsledek všude.
 *
 * Prohlížeč nedovolí zvuk, dokud uživatel se stránkou nekomunikuje.
 * Kontext se proto probudí při prvním klepnutí kamkoli.
 */

const KLIC_ZVUK = "bi-zvuk";
const KLIC_VIBRACE = "bi-vibrace";

let kontext: AudioContext | null = null;
let odemceno = false;

function ziskej(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!kontext) {
    const Trida = window.AudioContext ?? (window as unknown as {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
    if (!Trida) return null;
    kontext = new Trida();
  }
  return kontext;
}

/**
 * Odemknutí zvuku.
 *
 * Volá se z klepnutí. Bez toho Safari i Chrome přehrávání odmítnou
 * a první upozornění by bylo tiché.
 */
export function odemkniZvuk(): void {
  if (odemceno) return;
  const k = ziskej();
  if (!k) return;

  k.resume().catch(() => undefined);
  // Tichý impulz probudí zvukový řetězec na iOS.
  const o = k.createOscillator();
  const g = k.createGain();
  g.gain.value = 0;
  o.connect(g).connect(k.destination);
  o.start();
  o.stop(k.currentTime + 0.01);

  odemceno = true;
}

export const zvukZapnut = (): boolean => {
  try { return localStorage.getItem(KLIC_ZVUK) !== "ne"; } catch { return true; }
};
export const vibraceZapnuta = (): boolean => {
  try { return localStorage.getItem(KLIC_VIBRACE) !== "ne"; } catch { return true; }
};
export const nastavZvuk = (zap: boolean): void => {
  try { localStorage.setItem(KLIC_ZVUK, zap ? "ano" : "ne"); } catch { /* soukromý režim */ }
};
export const nastavVibraci = (zap: boolean): void => {
  try { localStorage.setItem(KLIC_VIBRACE, zap ? "ano" : "ne"); } catch { /* soukromý režim */ }
};

/** Umí zařízení vibrovat? iPhone ne — Safari to nepodporuje. */
export const umiVibrovat = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

/**
 * Zahraje upozornění.
 *
 * Vždy vrátí bez chyby — zvuk nesmí shodit akci, která ho vyvolala.
 */
export function zahraj(druh: Druh, vzdyZahrat = false): void {
  if (!vzdyZahrat && !zvukZapnut()) return;

  try {
    const k = ziskej();
    if (!k) return;
    if (k.state === "suspended") k.resume().catch(() => undefined);

    const ted = k.currentTime;

    for (const t of MELODIE[druh]) {
      const osc = k.createOscillator();
      const zisk = k.createGain();

      osc.type = t.tvar ?? "sine";
      osc.frequency.value = t.hz;

      /**
       * Náběh a doznění po křivce.
       *
       * Skokové zapnutí a vypnutí zní jako lupnutí — ucho slyší
       * ostrou hranu jako prasknutí, ne jako tón.
       */
      const zac = ted + t.od;
      const kon = zac + t.delka;
      zisk.gain.setValueAtTime(0.0001, zac);
      zisk.gain.exponentialRampToValueAtTime(t.hlasitost, zac + 0.012);
      zisk.gain.exponentialRampToValueAtTime(0.0001, kon);

      osc.connect(zisk).connect(k.destination);
      osc.start(zac);
      osc.stop(kon + 0.02);
    }
  } catch { /* zvuk nikdy nesmí shodit akci */ }

  if (vibraceZapnuta() && umiVibrovat()) {
    try { navigator.vibrate(VIBRACE[druh]); } catch { /* některé prohlížeče odmítnou */ }
  }
}

/* ============================================================
   HLAS
   Namluvené věty z ElevenLabs. Když nejsou k dispozici,
   zahraje se tón — upozornění nesmí zmizet jen proto,
   že služba neodpověděla.
   ============================================================ */

const KLIC_HLAS = "bi-hlas";

/** Odkazy se stáhnou jednou za relaci, ne při každém upozornění. */
let odkazy: Record<string, string> | null = null;
let nacitaSe: Promise<void> | null = null;

/** Zapnuto, dokud si to někdo nevypne. Viz lib/asistent/hlas.ts. */
export const hlasZapnut = (): boolean => {
  try { return localStorage.getItem(KLIC_HLAS) !== "ne"; } catch { return true; }
};
export const nastavHlas = (zap: boolean): void => {
  try { localStorage.setItem(KLIC_HLAS, zap ? "ano" : "ne"); } catch { /* soukromý režim */ }
};

async function nactiOdkazy(): Promise<void> {
  if (odkazy) return;
  if (nacitaSe) return nacitaSe;

  nacitaSe = (async () => {
    try {
      const r = await fetch("/api/hlas", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      odkazy = d?.odkazy ?? {};
    } catch {
      odkazy = {};
    }
  })();

  return nacitaSe;
}

/** Připraví hlas dopředu, aby první upozornění nečekalo. */
export const predpripravHlas = (): void => { void nactiOdkazy(); };

/**
 * Řekne větu. Když hlas není, zahraje tón.
 *
 * Nikdy nevyhodí chybu — upozornění nesmí shodit akci.
 */
export async function rekni(veta: string, zaloha: Druh = "upozorneni"): Promise<void> {
  if (!hlasZapnut() || !zvukZapnut()) { zahraj(zaloha); return; }

  await nactiOdkazy();
  const url = odkazy?.[veta];
  if (!url) { zahraj(zaloha); return; }

  try {
    const a = new Audio(url);
    a.volume = 0.85;
    // Když prohlížeč přehrání odmítne, ozve se aspoň tón.
    await a.play().catch(() => zahraj(zaloha));
  } catch {
    zahraj(zaloha);
  }

  if (vibraceZapnuta() && umiVibrovat()) {
    try { navigator.vibrate(VIBRACE[zaloha]); } catch { /* odmítnuto */ }
  }
}
