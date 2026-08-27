"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zahraj } from "@/lib/zvuk/prehravac";

/**
 * Zvoneček.
 *
 * Ukazuje jen to, co vyžaduje zásah. Když není co, nemá tečku —
 * odznak, který svítí pořád, přestane po týdnu fungovat.
 */

type Polozka = { klic: string; nazev: string; pocet: number; ikona: string; href: string };
type Svatek = { id: string; jmeno: string; datum: string; zaDni: number };

export default function Zvonecek() {
  const router = useRouter();
  const [otevreno, setOtevreno] = useState(false);
  const [polozky, setPolozky] = useState<Polozka[]>([]);
  const [jmeniny, setJmeniny] = useState("");
  const [svatky, setSvatky] = useState<Svatek[]>([]);
  const obal = useRef<HTMLDivElement>(null);
  /** Předchozí počet. Zvuk jen při přírůstku, ne při každém načtení. */
  const posledni = useRef<number | null>(null);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch("/api/upozorneni", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) return;
      const nove = (d.polozky ?? []) as Polozka[];
      const soucet = nove.reduce((a: number, p: Polozka) => a + p.pocet, 0);

      // První načtení mlčí — jinak by to zvonilo při každém
      // otevření aplikace, i když se nic nezměnilo.
      if (posledni.current !== null && soucet > posledni.current) {
        zahraj("upozorneni");
      }
      posledni.current = soucet;

      setPolozky(nove);
      setJmeniny(d.jmeniny ?? "");
      setSvatky(d.svatky ?? []);
    } catch { /* příště */ }
  }, []);

  useEffect(() => {
    nacti();
    // Obnova po minutě. Na odsvícené kartě se neptá.
    const t = setInterval(() => { if (!document.hidden) nacti(); }, 60_000);
    return () => clearInterval(t);
  }, [nacti]);

  useEffect(() => {
    const klik = (e: MouseEvent) => {
      if (!obal.current?.contains(e.target as Node)) setOtevreno(false);
    };
    document.addEventListener("mousedown", klik);
    return () => document.removeEventListener("mousedown", klik);
  }, []);

  const celkem = polozky.reduce((a, p) => a + p.pocet, 0);
  const dnesniSvatky = svatky.filter((s) => s.zaDni === 0);

  return (
    <div className="zv" ref={obal}>
      <button
        className={`zv-tlacitko tap ${otevreno ? "zv-tlacitko--on" : ""}`}
        onClick={() => setOtevreno((o) => !o)}
        aria-label={celkem > 0 ? `Upozornění: ${celkem}` : "Upozornění"}
        aria-expanded={otevreno}
      >
        <i className={`ti ti-bell${celkem > 0 ? "-ringing" : ""}`} aria-hidden="true" />
        {celkem > 0 && <span className="zv-odznak">{celkem > 99 ? "99+" : celkem}</span>}
      </button>

      {otevreno && (
        <div className="zv-panel" role="dialog" aria-label="Upozornění">
          {jmeniny && (
            <div className="zv-svatek">
              <span className="zv-svatek__znak">
                <i className="ti ti-cake" aria-hidden="true" />
              </span>
              <span>
                <span className="zv-svatek__nazev">Dnes má svátek {jmeniny}</span>
                {dnesniSvatky.length > 0 && (
                  <span className="zv-svatek__nasi">
                    U nás: {dnesniSvatky.map((s) => s.jmeno).join(", ")}
                  </span>
                )}
              </span>
            </div>
          )}

          {polozky.length === 0 ? (
            <p className="zv-prazdno">
              <i className="ti ti-check" aria-hidden="true" />
              Nic nečeká. Můžeš dělat něco jiného.
            </p>
          ) : (
            <div className="zv-seznam">
              {polozky.map((p) => (
                <button
                  key={p.klic}
                  className="zv-radek"
                  onClick={() => { setOtevreno(false); router.push(p.href); }}
                >
                  <span className="zv-ikona">
                    <i className={`ti ti-${p.ikona}`} aria-hidden="true" />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>{p.nazev}</span>
                  <span className="data zv-pocet">{p.pocet}</span>
                </button>
              ))}
            </div>
          )}

          {/* Blížící se svátky kolegů. Připomínka dopředu, ne gratulace zpětně. */}
          {svatky.filter((s) => s.zaDni > 0).length > 0 && (
            <div className="zv-nadchazi">
              <p className="data zv-nadchazi__nadpis">BLÍŽÍ SE</p>
              {svatky.filter((s) => s.zaDni > 0).slice(0, 4).map((s) => (
                <p key={s.id} className="zv-nadchazi__radek">
                  <span>{s.jmeno}</span>
                  <span className="data">
                    {s.zaDni === 1 ? "zítra" : `za ${s.zaDni} dní`} · {s.datum}
                  </span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
