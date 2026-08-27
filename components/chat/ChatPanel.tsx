"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rekni } from "@/lib/zvuk/prehravac";

/**
 * Týmový chat.
 *
 * Nové zprávy se dotahují po pěti vteřinách a **jen ty novější než
 * poslední známé id** — celý kanál se tak netahá pořád dokola.
 * Odsvícená karta se neptá vůbec.
 */

type Kanal = { id: number; nazev: string; popis: string | null; soukromy: boolean };
type Zprava = {
  id: number; kanal_id: number; autor: string;
  autor_jmeno: string | null; text: string; created_at: string;
};

const cas = (iso: string) =>
  new Date(iso).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });

const den = (iso: string) => new Date(iso).toLocaleDateString("cs-CZ");

export default function ChatPanel({ jaId }: { jaId: string }) {
  const [kanaly, setKanaly] = useState<Kanal[]>([]);
  const [aktivni, setAktivni] = useState<number | null>(null);
  const [zpravy, setZpravy] = useState<Zprava[]>([]);
  const [text, setText] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);
  const [novy, setNovy] = useState(false);
  const [nazevKanalu, setNazevKanalu] = useState("");
  const konec = useRef<HTMLDivElement>(null);

  const nactiKanaly = useCallback(async () => {
    try {
      const r = await fetch("/api/chat", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setChyba(d?.error ?? "Načtení selhalo."); return; }
      setKanaly(d.kanaly ?? []);
      setChyba(null);
      if (d.kanaly?.length && aktivni === null) setAktivni(d.kanaly[0].id);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }, [aktivni]);

  useEffect(() => { nactiKanaly(); }, [nactiKanaly]);

  // Načtení kanálu a pak jen přírůstky.
  useEffect(() => {
    if (aktivni === null) return;
    let zruseno = false;

    const nacti = async (od = 0) => {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/chat?kanal=${aktivni}${od ? `&od=${od}` : ""}`, { cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (!r.ok || zruseno) return;
        const nove = (d.zpravy ?? []) as Zprava[];
        if (od === 0) setZpravy(nove);
        else if (nove.length) {
          setZpravy((z) => [...z, ...nove]);
          // Jen cizí zprávy. Vlastní odeslání si člověk uvědomuje sám.
          if (nove.some((z) => z.autor !== jaId)) void rekni("zprava", "zprava");
        }
      } catch { /* další pokus za pět vteřin */ }
    };

    setZpravy([]);
    nacti();
    const t = setInterval(() => {
      setZpravy((z) => { nacti(z.length ? z[z.length - 1].id : 0); return z; });
    }, 5000);

    return () => { zruseno = true; clearInterval(t); };
  }, [aktivni]);

  useEffect(() => {
    konec.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [zpravy.length]);

  async function posli() {
    const t = text.trim();
    if (!t || aktivni === null) return;
    setText("");
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kanal: aktivni, text: t }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setChyba(d?.error ?? "Odeslání selhalo."); setText(t); }
      else setZpravy((z) => [...z, d.zprava]);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
      setText(t);
    }
  }

  async function zalozKanal() {
    const n = nazevKanalu.trim();
    if (!n) return;
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novyKanal: n }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Založení selhalo.");
      else {
        setKanaly((k) => [...k, d.kanal].sort((a, b) => a.nazev.localeCompare(b.nazev)));
        setAktivni(d.kanal.id);
        setNovy(false);
        setNazevKanalu("");
      }
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }

  return (
    <>
      {chyba && (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">{chyba}</span>{" "}
            <span className="adm-alert__detail">Spustil jsi supabase/chat-trezor.sql?</span>
          </span>
        </div>
      )}

      <div className="ch">
        <div className="ch__kanaly">
          <div className="ch__kanaly-hlava">
            <span className="data ch__k-nadpis">KANÁLY</span>
            <button className="kal__pridat tap" onClick={() => setNovy((n) => !n)} aria-label="Nový kanál">
              <i className={`ti ti-${novy ? "x" : "plus"}`} aria-hidden="true" />
            </button>
          </div>

          {novy && (
            <div className="ch__novy">
              <input
                value={nazevKanalu}
                onChange={(e) => setNazevKanalu(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && zalozKanal()}
                placeholder="název kanálu"
                aria-label="Název nového kanálu"
                autoFocus
              />
              <button className="adm-btn adm-btn--primary" onClick={zalozKanal}>Založit</button>
            </div>
          )}

          <div className="ch__seznam">
            {kanaly.map((k) => (
              <button
                key={k.id}
                className={`ch__kanal ${k.id === aktivni ? "ch__kanal--on" : ""}`}
                onClick={() => setAktivni(k.id)}
              >
                <i className="ti ti-hash" aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="ch__kanal-nazev">{k.nazev}</span>
                  {k.popis && <span className="ch__kanal-popis">{k.popis}</span>}
                </span>
              </button>
            ))}
            {kanaly.length === 0 && (
              <p className="kal__prazdno" style={{ padding: "8px 4px" }}>
                Zatím žádný kanál. Založ první tlačítkem nahoře.
              </p>
            )}
          </div>
        </div>

        <div className="ch__okno">
          <div className="ch__zpravy">
            {zpravy.length === 0 ? (
              <p className="kal__prazdno">Zatím tu nikdo nic nenapsal.</p>
            ) : (
              zpravy.map((z, i) => {
                const moje = z.autor === jaId;
                // Jméno a čas jen u první zprávy z řady od stejného
                // člověka — jinak se seznam rozdrobí na hlavičky.
                const navazuje =
                  i > 0 &&
                  zpravy[i - 1].autor === z.autor &&
                  new Date(z.created_at).getTime() - new Date(zpravy[i - 1].created_at).getTime() < 3 * 60_000;
                const novyDen = i === 0 || den(zpravy[i - 1].created_at) !== den(z.created_at);

                return (
                  <div key={z.id}>
                    {novyDen && <p className="ch__den">{den(z.created_at)}</p>}
                    <div className={`ch__zprava ${moje ? "ch__zprava--moje" : ""} ${navazuje ? "ch__zprava--navazuje" : ""}`}>
                      {!navazuje && (
                        <span className="ch__hlavicka">
                          <span className="ch__autor">{moje ? "já" : (z.autor_jmeno ?? "někdo")}</span>
                          <span className="data ch__cas">{cas(z.created_at)}</span>
                        </span>
                      )}
                      <span className="ch__text">{z.text}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={konec} />
          </div>

          <div className="pz-vstup" style={{ marginTop: 0 }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); posli(); }
              }}
              placeholder={aktivni ? "Napiš zprávu…" : "Nejdřív vyber kanál"}
              rows={1}
              disabled={aktivni === null}
              aria-label="Zpráva"
            />
            <button className="pz-odeslat tap" onClick={posli} disabled={!text.trim()} aria-label="Odeslat">
              <i className="ti ti-arrow-up" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
