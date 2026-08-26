/**
 * Rozpoznání dvojího tlesknutí.
 *
 * Měří se jen hlasitost přímo v prohlížeči — žádný zvuk zařízení
 * neopustí a nic se nenahrává. Klíčové slovo by naproti tomu
 * potřebovalo rozpoznávání řeči, které zvuk posílá poskytovateli.
 */

const PRAH = 0.35;
const MIN_ODSTUP = 140;   // ms mezi údery, odfiltruje jeden dlouhý zvuk
const OKNO_PARU = 700;    // ms na druhé tlesknutí

export type Poslech = { stop: () => void };

export async function poslouchejTlesk(priTlesknuti: () => void): Promise<Poslech | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) return null;

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      // Vyrovnávání hlasitosti by prudký náběh tlesknutí zploštilo
      // a detekce by přestala fungovat.
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch {
    return null;
  }

  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser);

  const buf = new Uint8Array(analyser.frequencyBinCount);
  let raf = 0;
  let posledni = 0;
  let cekaNaDruhe = 0;

  function smycka() {
    analyser.getByteTimeDomainData(buf);
    let max = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = Math.abs(buf[i] - 128) / 128;
      if (v > max) max = v;
    }

    const ted = performance.now();
    if (max > PRAH && ted - posledni > MIN_ODSTUP) {
      posledni = ted;
      // Jednotlivé rány se dějí pořád — dveře, hrnek, klávesnice.
      // Dvě do sedmi set milisekund jsou skoro vždy záměr.
      if (cekaNaDruhe && ted - cekaNaDruhe < OKNO_PARU) {
        cekaNaDruhe = 0;
        priTlesknuti();
      } else {
        cekaNaDruhe = ted;
      }
    }
    if (cekaNaDruhe && ted - cekaNaDruhe > OKNO_PARU) cekaNaDruhe = 0;

    raf = requestAnimationFrame(smycka);
  }
  raf = requestAnimationFrame(smycka);

  return {
    stop() {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => undefined);
    },
  };
}
