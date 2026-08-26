import type { ResultsProvider } from "./base";
import { MockResultsProvider } from "./mock";
import { log } from "@/lib/log";

/**
 * Volba poskytovatele výsledků.
 *
 * Bez klíče se nevrací mock jako by byl skutečný — vrací se mock
 * s live:false a zúčtování se podle toho zachová: nic nezapíše.
 * Vymyšlený výsledek je horší než žádný.
 */
export function getResultsProvider(): ResultsProvider {
  const key = process.env.RESULTS_API_KEY;

  if (!key) {
    log("debug", "results", "RESULTS_API_KEY chybí, běží vývojový poskytovatel");
    return new MockResultsProvider();
  }

  // Sem přijde skutečný adaptér, až bude poskytovatel vybraný.
  // Do té doby raději mock než vymyšlené mapování na neznámé API.
  log("warn", "results", "RESULTS_API_KEY je nastavený, ale adaptér ještě neexistuje");
  return new MockResultsProvider();
}
