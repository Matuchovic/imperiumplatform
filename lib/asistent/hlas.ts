/**
 * Řeč asistenta.
 *
 * Používá syntézu vestavěnou v prohlížeči — nic se nikam neodesílá
 * a nestojí to nic. Hlas je robotický, ale výměna za placenou službu
 * je pak jeden soubor.
 */

const KLIC = "bi:hlas";

export const hlasZapnut = (): boolean =>
  typeof window !== "undefined" && localStorage.getItem(KLIC) === "1";

export function prepniHlas(zapnout: boolean): void {
  localStorage.setItem(KLIC, zapnout ? "1" : "0");
  if (!zapnout) zmlkni();
}

export const umiMluvit = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Syntéza čte čísla po číslicích a zkratky hláskuje. Bez úpravy
 * z toho vyjde „plus jedna tečka osm procento“ místo věty,
 * která jde poslouchat.
 */
export function proRec(text: string): string {
  return text
    .replace(/(\d+),(\d+)\s*%/g, "$1 celá $2 procenta")
    .replace(/(\d+)\.(\d+)\s*%/g, "$1 celá $2 procenta")
    .replace(/(\d+),(\d+)/g, "$1 celá $2")
    .replace(/−|-(?=\d)/g, "minus ")
    .replace(/\+(?=\d)/g, "plus ")
    .replace(/\bCLV\b/g, "C L V")
    .replace(/\bROI\b/g, "R O I")
    .replace(/\bKč\b/g, "korun")
    // Mezery v tisících syntéza čte jako pauzu uprostřed čísla.
    .replace(/(\d)\s(?=\d{3}\b)/g, "$1");
}

/** Mluví se jen první věta. Zbytek, hlavně výhrady, se lépe čte. */
export function prvniVeta(text: string): string {
  const konec = text.search(/[.!?](\s|$)/);
  return konec === -1 ? text : text.slice(0, konec + 1);
}

export function rekni(text: string, vse = false): void {
  if (!umiMluvit() || !hlasZapnut() || !text.trim()) return;

  zmlkni();
  const u = new SpeechSynthesisUtterance(proRec(vse ? text : prvniVeta(text)));
  u.lang = "cs-CZ";
  u.rate = 1.02;
  u.pitch = 0.95;

  const cesky = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("cs"));
  if (cesky) u.voice = cesky;

  window.speechSynthesis.speak(u);
}

export function zmlkni(): void {
  if (umiMluvit()) window.speechSynthesis.cancel();
}
