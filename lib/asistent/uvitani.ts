/**
 * Uvítání po přihlášení.
 *
 * Bez závislostí, aby se dalo otestovat — vokativ českých jmen
 * je místo, kde se snadno chybuje a chyba je hned slyšet.
 */

/**
 * Pátý pád jména.
 *
 * Oslovit někoho prvním pádem zní jako čtení ze seznamu.
 * Pravidla nejsou úplná, ale pokrývají běžná česká jména —
 * u nerozpoznaného tvaru se raději nechá první pád než
 * vymyslí špatný.
 */
export function vokativ(jmeno: string): string {
  const j = jmeno.trim().split(/\s+/)[0] ?? "";
  if (j.length < 2) return j;

  const male = j.toLowerCase();

  // Ondra, Honza, Sáva — měkké -a se mění na -o.
  if (male.endsWith("a")) return j.slice(0, -1) + "o";

  // Jiří, Ondřej, Ondrej — končí na měkkou souhlásku či -j.
  if (/[jř]$/.test(male)) return j + "i";
  if (male.endsWith("í")) return j;

  // Petr → Petře, Alexandr → Alexandře.
  if (male.endsWith("r") && !male.endsWith("or")) return j.slice(0, -1) + "ře";

  // Marek → Marku, Radek → Radku. Vypadává -e-.
  if (male.endsWith("ek")) return j.slice(0, -2) + "ku";

  // Tomáš, Lukáš, Denis, Luboš — sykavky berou -i.
  if (/[šsžcč]$/.test(male)) return j + "i";

  // Jakub, Martin, Pavel, Adam — tvrdé souhlásky berou -e.
  if (/[bdlmnptvz]$/.test(male)) return j + "e";

  // Zbytek beze změny. Špatný vokativ je horší než žádný.
  return j;
}

export type Cast = "rano" | "dopoledne" | "odpoledne" | "vecer" | "noc";

export function castDne(d = new Date()): Cast {
  const h = d.getHours();
  if (h < 5) return "noc";
  if (h < 9) return "rano";
  if (h < 12) return "dopoledne";
  if (h < 18) return "odpoledne";
  return "vecer";
}

const POZDRAV: Record<Cast, string> = {
  noc: "Dobrou noc",
  rano: "Dobré ráno",
  dopoledne: "Dobré dopoledne",
  odpoledne: "Dobré odpoledne",
  vecer: "Dobrý večer",
};

export type Souhrn = {
  posta?: number;
  ukoly?: number;
  faktury?: number;
  podpora?: number;
};

/** Skloňování počtu. Čeština má tři tvary a je to slyšet. */
function kolik(n: number, jedna: string, dva: string, pet: string): string {
  if (n === 1) return `jedna ${jedna}`;
  if (n < 5) return `${n} ${dva}`;
  return `${n} ${pet}`;
}

/**
 * Uvítací věta.
 *
 * Když něco čeká, řekne co. Když ne, řekne že je čisto — obojí
 * je informace, mlčení není.
 */
export function uvitani(jmeno: string, s: Souhrn = {}, ted = new Date()): string {
  const oslov = vokativ(jmeno);
  const zacatek = oslov ? `${POZDRAV[castDne(ted)]}, ${oslov}.` : `${POZDRAV[castDne(ted)]}.`;

  const casti: string[] = [];
  if (s.posta) casti.push(kolik(s.posta, "nepřečtená zpráva", "nepřečtené zprávy", "nepřečtených zpráv"));
  if (s.podpora) casti.push(kolik(s.podpora, "nový dotaz", "nové dotazy", "nových dotazů"));
  if (s.ukoly) casti.push(kolik(s.ukoly, "úkol po termínu", "úkoly po termínu", "úkolů po termínu"));
  if (s.faktury) casti.push(kolik(s.faktury, "faktura po splatnosti", "faktury po splatnosti", "faktur po splatnosti"));

  if (casti.length === 0) {
    return `${zacatek} Nic nečeká. Co budeme dělat?`;
  }

  // Poslední se spojí spojkou, ne čárkou — čte se to přirozeněji.
  const vyjmenovani = casti.length === 1
    ? casti[0]
    : `${casti.slice(0, -1).join(", ")} a ${casti[casti.length - 1]}`;

  return `${zacatek} Čeká ${vyjmenovani}. Co budeme dělat?`;
}
