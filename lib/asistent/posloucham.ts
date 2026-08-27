/**
 * Rozpoznávání řeči.
 *
 * Používá to, co má prohlížeč vestavěné — nic se neposílá na cizí
 * server a nestojí to nic. Chrome a Safari to umí, Firefox ne.
 *
 * Čistá logika je vedle v `rec.ts`, aby šla otestovat bez prohlížeče.
 */

import { ocistiPrepis, jeSmysluplne } from "./rec";

type Rozpoznavani = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => Rozpoznavani;
    webkitSpeechRecognition?: new () => Rozpoznavani;
  }
}

export const umiPoslouchat = (): boolean =>
  typeof window !== "undefined" &&
  Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

/** Jak dlouho po dořečení se čeká, než se věta odešle. */
const TICHO_MS = 1400;

export type Poslech = {
  /** Zastaví poslech a odešle, co se stihlo říct. */
  stop: () => void;
  /** Zruší bez odeslání. */
  zrus: () => void;
};

/**
 * Poslouchá, dokud člověk nedomluví.
 *
 * Průběžný přepis se hlásí zvlášť od hotového — díky tomu je
 * na obrazovce vidět, že systém opravdu slyší, a ne že zamrzl.
 */
export function poslouchej({
  prubezne,
  hotovo,
  chyba,
  konec,
}: {
  prubezne?: (text: string) => void;
  hotovo: (text: string) => void;
  chyba?: (duvod: string) => void;
  konec?: () => void;
}): Poslech | null {
  const Trida = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Trida) return null;

  const r = new Trida();
  r.lang = "cs-CZ";
  r.continuous = true;
  r.interimResults = true;
  /**
   * Jedna varianta.
   *
   * Víc variant vypadalo jako zlepšení, ale u průběžných výsledků
   * se chová nepředvídatelně a rozhovor se rozpadl.
   */
  r.maxAlternatives = 1;

  let sebrano = "";
  /**
   * Poslední průběžný přepis.
   *
   * Safari při souvislém poslechu větu často neuzavře — pak zůstane
   * celý text jen tady. Bez toho by se čekalo donekonečna.
   */
  let castecne = "";
  let casovac: number | null = null;
  let ukonceno = false;

  const zrus = () => {
    if (casovac !== null) { window.clearTimeout(casovac); casovac = null; }
  };

  const odesli = () => {
    zrus();
    const text = ocistiPrepis(sebrano + castecne);
    sebrano = "";
    castecne = "";
    if (jeSmysluplne(text)) hotovo(text);
  };

  r.onresult = (e) => {
    let nove = "";

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const alt = e.results[i][0]?.transcript ?? "";
      if (e.results[i].isFinal) sebrano += alt + " ";
      else nove += alt;
    }
    castecne = nove;

    prubezne?.(ocistiPrepis(sebrano + castecne));

    /**
     * Odpočet běží od každého slova, ne až od uzavřené věty.
     *
     * Kdyby se čekalo na uzavření, Safari by odeslání nikdy
     * nespustilo. Pauza uprostřed věty odpočet jen odloží.
     */
    zrus();
    if ((sebrano + castecne).trim()) {
      casovac = window.setTimeout(odesli, TICHO_MS);
    }
  };

  r.onerror = (e) => {
    // Ticho není chyba, jen se nic neřeklo.
    if (e.error === "no-speech" || e.error === "aborted") return;
    chyba?.(
      e.error === "not-allowed"
        ? "Mikrofon není povolený. Povol ho v nastavení prohlížeče."
        : e.error === "network"
        ? "Rozpoznávání potřebuje připojení."
        : `Rozpoznávání selhalo: ${e.error}`
    );
  };

  r.onend = () => {
    if (ukonceno) return;
    // Prohlížeč poslech sám ukončí po chvíli ticha. Co se stihlo
    // sebrat, se má odeslat, ne zahodit.
    odesli();
    konec?.();
  };

  try {
    r.start();
  } catch {
    chyba?.("Poslech se nepodařilo spustit.");
    return null;
  }

  return {
    /** Zastaví poslech a odešle, co se stihlo říct. */
    stop: () => {
      ukonceno = true;
      const text = ocistiPrepis(sebrano + castecne);
      zrus();
      sebrano = "";
      castecne = "";
      try { r.abort(); } catch { /* už skončil */ }
      // Zahodit rozmluvenou větu jen proto, že člověk klepl
      // na stop, by znamenalo říkat ji znovu.
      if (jeSmysluplne(text)) hotovo(text);
      konec?.();
    },
    /** Zruší bez odeslání. Pro zavření panelu. */
    zrus: () => {
      ukonceno = true;
      zrus();
      sebrano = "";
      castecne = "";
      try { r.abort(); } catch { /* už skončil */ }
      konec?.();
    },
  };
}
