"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Rychlé poznámky pod kalendářem.
 *
 * Firemní vidí celý tým, osobní jen autor. Přepínač je nad polem,
 * aby bylo jasné, kam poznámka půjde, ještě než se začne psát.
 */

type Poznamka = {
  id: number;
  text: string;
  sdilena: boolean;
  hotovo: boolean;
  autor: string;
  autor_jmeno: string | null;
  created_at: string;
};

const kdy = (iso: string) => {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 36e5);
  if (h < 1) return "právě teď";
  if (h < 24) return `před ${h} h`;
  return new Date(iso).toLocaleDateString("cs-CZ");
};

export default function Poznamky({ jaId }: { jaId: string }) {
  const [seznam, setSeznam] = useState<Poznamka[]>([]);
  const [text, setText] = useState("");
  const [sdilena, setSdilena] = useState(false);
  const [bezi, setBezi] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch("/api/poznamky", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Načtení selhalo.");
      else { setSeznam(d.poznamky ?? []); setChyba(null); }
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }, []);

  useEffect(() => { nacti(); }, [nacti]);

  async function pridej() {
    const t = text.trim();
    if (!t || bezi) return;
    setBezi(true);
    try {
      const r = await fetch("/api/poznamky", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, sdilena }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Uložení selhalo.");
      else { setText(""); setSeznam((s) => [d.poznamka, ...s]); }
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setBezi(false);
  }

  async function prepni(p: Poznamka) {
    // Optimisticky, ať zaškrtnutí nečeká na síť.
    setSeznam((s) => s.map((x) => (x.id === p.id ? { ...x, hotovo: !x.hotovo } : x)));
    await fetch("/api/poznamky", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, hotovo: !p.hotovo }),
    }).catch(() => setSeznam((s) => s.map((x) => (x.id === p.id ? { ...x, hotovo: p.hotovo } : x))));
  }

  async function smaz(id: number) {
    setSeznam((s) => s.filter((x) => x.id !== id));
    await fetch(`/api/poznamky?id=${id}`, { method: "DELETE" }).catch(() => nacti());
  }

  return (
    <div className="adm-panel">
      <p className="adm-panel__title">Poznámky</p>

      {chyba && (
        <div className="adm-alert adm-alert--warn" style={{ marginTop: 10 }}>
          <span className="adm-alert__text">
            <span className="adm-alert__title">{chyba}</span>{" "}
            <span className="adm-alert__detail">Spustil jsi supabase/kalendar.sql?</span>
          </span>
        </div>
      )}

      <div className="pz-prepinac">
        <button
          className={`pz-volba ${!sdilena ? "pz-volba--on" : ""}`}
          onClick={() => setSdilena(false)}
          aria-pressed={!sdilena}
        >
          <i className="ti ti-user" aria-hidden="true" />
          Jen moje
        </button>
        <button
          className={`pz-volba ${sdilena ? "pz-volba--on" : ""}`}
          onClick={() => setSdilena(true)}
          aria-pressed={sdilena}
        >
          <i className="ti ti-users" aria-hidden="true" />
          Pro tým
        </button>
      </div>

      <div className="pz-vstup">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter odešle, Shift+Enter zalomí — u krátkých zápisků
            // se nikdo nechce trefovat myší.
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); pridej(); }
          }}
          placeholder={sdilena ? "Poznámka pro tým…" : "Poznámka jen pro mě…"}
          rows={2}
          aria-label="Nová poznámka"
        />
        <button className="pz-odeslat tap" onClick={pridej} disabled={bezi || !text.trim()} aria-label="Uložit">
          <i className="ti ti-arrow-up" aria-hidden="true" />
        </button>
      </div>

      <div className="pz-seznam">
        {seznam.length === 0 ? (
          <p className="kal__prazdno">Zatím tu nic není. Enter odešle, Shift+Enter zalomí řádek.</p>
        ) : (
          seznam.map((p) => (
            <div key={p.id} className={`pz-radek ${p.hotovo ? "pz-radek--hotovo" : ""}`}>
              <button
                className={`uk-box ${p.hotovo ? "uk-box--on" : ""}`}
                onClick={() => prepni(p)}
                aria-label={p.hotovo ? "Zrušit" : "Označit jako hotové"}
              >
                {p.hotovo && <i className="ti ti-check" aria-hidden="true" />}
              </button>

              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="pz-text">{p.text}</span>
                <span className="pz-meta">
                  <span style={{ color: p.sdilena ? "#60a5fa" : undefined }}>
                    {p.sdilena ? `tým · ${p.autor_jmeno ?? "někdo"}` : "jen moje"}
                  </span>
                  <span>{kdy(p.created_at)}</span>
                </span>
              </span>

              {(p.sdilena || p.autor === jaId) && (
                <button className="kal__smazat tap" onClick={() => smaz(p.id)} aria-label="Smazat">
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
