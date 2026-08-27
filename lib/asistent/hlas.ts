/**
 * Řeč asistenta.
 *
 * Mluví přes ElevenLabs. Zvuk se streamuje, takže přehrávání
 * začne dřív, než je celá věta hotová.
 *
 * Když služba není nastavená nebo neodpoví, použije se syntéza
 * vestavěná v prohlížeči. Zní roboticky, ale asistent nemá
 * zmlknout jen proto, že cizí služba měla výpadek.
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

/** Právě hrající zvuk. Nová věta přeruší předchozí. */
let prehravac: HTMLAudioElement | null = null;

/** Zda je služba dostupná. Zjistí se jednou a pamatuje se. */
let sluzba: boolean | null = null;

export function rekni(text: string, vse = false): void {
  if (!hlasZapnut() || !text.trim()) return;

  const veta = proRec(vse ? text : prvniVeta(text));
  zmlkni();

  // Když už víme, že služba není, nezkoušíme ji znovu.
  if (sluzba === false) { prohlizecem(veta); return; }

  void (async () => {
    try {
      const r = await fetch("/api/hlas/rec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: veta }),
      });

      if (!r.ok) { sluzba = false; prohlizecem(veta); return; }
      sluzba = true;

      const zvuk = await r.blob();
      const url = URL.createObjectURL(zvuk);

      const a = new Audio(url);
      prehravac = a;
      // Adresa se uvolní, jinak by v paměti zůstala každá věta.
      a.onended = () => URL.revokeObjectURL(url);
      a.onerror = () => { URL.revokeObjectURL(url); prohlizecem(veta); };

      await a.play().catch(() => prohlizecem(veta));
    } catch {
      sluzba = false;
      prohlizecem(veta);
    }
  })();
}

/** Záloha. Robotická, ale vždycky po ruce. */
function prohlizecem(veta: string): void {
  if (!umiMluvit()) return;

  const u = new SpeechSynthesisUtterance(veta);
  u.lang = "cs-CZ";
  u.rate = 1.02;
  u.pitch = 0.95;

  const cesky = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("cs"));
  if (cesky) u.voice = cesky;

  window.speechSynthesis.speak(u);
}

export function zmlkni(): void {
  if (prehravac) {
    prehravac.pause();
    prehravac.currentTime = 0;
    prehravac = null;
  }
  if (umiMluvit()) window.speechSynthesis.cancel();
}
