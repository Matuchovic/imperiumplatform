/**
 * Evidence rozdělané práce.
 *
 * Nejdůležitější pravidlo lišty aktualizace: NIKDY NEOBNOVIT NAD
 * ROZDĚLANOU PRACÍ. Formulář nastavení drží změny ve stavu, dokud
 * uživatel neklikne na Uložit — obnovení v tu chvíli je ztratí
 * a nikdo nepozná proč.
 *
 * Komponenty se sem hlásí, když mají co ztratit, a odhlašují se
 * po uložení.
 */

const rozdelane = new Set<string>();
const posluchaci = new Set<(pocet: number) => void>();

function oznam() {
  const n = rozdelane.size;
  posluchaci.forEach((fn) => fn(n));
}

export function oznacRozdelanou(klic: string): void {
  if (rozdelane.has(klic)) return;
  rozdelane.add(klic);
  oznam();
}

export function uvolniRozdelanou(klic: string): void {
  if (!rozdelane.delete(klic)) return;
  oznam();
}

export const kolikNeulozenych = (): number => rozdelane.size;

export function sledujPraci(fn: (pocet: number) => void): () => void {
  posluchaci.add(fn);
  fn(rozdelane.size);
  return () => posluchaci.delete(fn);
}
