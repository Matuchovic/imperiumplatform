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
  /** Ukončí poslech a nic neodešle. */
  stop: () => void;
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
  r.maxAlternatives = 1;

  let sebrano = "";
  let casovac: number | null = null;
  let ukonceno = false;

  const zrus = () => {
    if (casovac !== null) { window.clearTimeout(casovac); casovac = null; }
  };

  const odesli = () => {
    zrus();
    const text = ocistiPrepis(sebrano);
    sebrano = "";
    if (jeSmysluplne(text)) hotovo(text);
  };

  r.onresult = (e) => {
    let castecne = "";

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const alt = e.results[i][0]?.transcript ?? "";
      if (e.results[i].isFinal) sebrano += alt + " ";
      else castecne += alt;
    }

    prubezne?.(ocistiPrepis(sebrano + castecne));

    // Každé slovo odloží odeslání. Pauza uprostřed věty
    // nemá znamenat, že člověk domluvil.
    zrus();
    if (sebrano.trim()) {
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
    stop: () => {
      ukonceno = true;
      zrus();
      try { r.abort(); } catch { /* už skončil */ }
      konec?.();
    },
  };
}
