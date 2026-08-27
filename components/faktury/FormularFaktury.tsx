"use client";

import { useState } from "react";
import {
  prazdnaPolozka, soucty, SAZBY_DPH, JEDNOTKY, splatnostZa, type Polozka,
} from "@/lib/faktury/polozky";
import { kc } from "@/lib/faktury/stav";

/** Nová faktura. Součty se dopočítávají při psaní. */
export default function FormularFaktury({
  klienti, platceDph, onZavri, onUlozeno,
}: {
  klienti: { id: string; name: string }[];
  platceDph: boolean;
  onZavri: () => void;
  onUlozeno: () => void;
}) {
  const dnes = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    klient_id: "", odberatel: "", odberatel_ico: "", odberatel_dic: "",
    odberatel_adresa: "", odberatel_email: "",
    vystaveno: dnes, splatnost: splatnostZa(dnes, 14),
    poznamka: "", opakovana: false,
  });
  const [polozky, setPolozky] = useState<Polozka[]>([prazdnaPolozka()]);
  const [bezi, setBezi] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const zmen = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  function zmenPolozku(i: number, k: keyof Polozka, v: string | number) {
    setPolozky((s) => s.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  }

  const s = soucty(polozky.filter((p) => p.nazev.trim()), platceDph);

  async function uloz(vystavit: boolean) {
    const platne = polozky.filter((p) => p.nazev.trim());
    if (!f.odberatel.trim()) { setChyba("Vyplň odběratele."); return; }
    if (platne.length === 0) { setChyba("Přidej aspoň jednu položku."); return; }

    setBezi(true);
    setChyba(null);
    try {
      const r = await fetch("/api/faktury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, polozky: platne, stav: vystavit ? "vystavena" : "koncept" }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? "Uložení selhalo.");
      else onUlozeno();
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setBezi(false);
  }

  return (
    <>
      <div className="cl-scrim" onClick={onZavri} />
      <aside className="cl-panel cl-panel--siroky" role="dialog" aria-label="Nová faktura">
        <div className="cl-panel__top">
          <span style={{ flex: 1 }}>
            <span className="cl-panel__name">Nová faktura</span>
            <span className="data cl-panel__id">
              {platceDph ? "s DPH" : "neplátce DPH"}
            </span>
          </span>
          <button onClick={onZavri} className="tap cl-close" aria-label="Zavřít">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {chyba && (
          <div className="adm-alert adm-alert--bad">
            <span className="adm-alert__text"><span className="adm-alert__title">{chyba}</span></span>
          </div>
        )}

        {klienti.length > 0 && (
          <label className="set-pole">
            <span className="set-label">Klient ze systému</span>
            <select
              className="set-input"
              value={f.klient_id}
              onChange={(e) => {
                const k = klienti.find((x) => x.id === e.target.value);
                // Výběrem se předvyplní jméno, ale jde přepsat —
                // fakturuje se často firmě, ne osobě.
                setF((s) => ({ ...s, klient_id: e.target.value, odberatel: k?.name ?? s.odberatel }));
              }}
            >
              <option value="">Ručně vypsaný odběratel</option>
              {klienti.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </label>
        )}

        <label className="set-pole">
          <span className="set-label">Odběratel</span>
          <input className="set-input" value={f.odberatel}
                 onChange={(e) => zmen("odberatel", e.target.value)}
                 placeholder="Firma s.r.o." autoFocus />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="set-pole">
            <span className="set-label">IČO</span>
            <input className="set-input" value={f.odberatel_ico}
                   onChange={(e) => zmen("odberatel_ico", e.target.value)} />
          </label>
          <label className="set-pole">
            <span className="set-label">DIČ</span>
            <input className="set-input" value={f.odberatel_dic}
                   onChange={(e) => zmen("odberatel_dic", e.target.value)} />
          </label>
        </div>

        <label className="set-pole">
          <span className="set-label">Adresa</span>
          <input className="set-input" value={f.odberatel_adresa}
                 onChange={(e) => zmen("odberatel_adresa", e.target.value)} />
        </label>

        <label className="set-pole">
          <span className="set-label">E-mail</span>
          <input className="set-input" type="email" value={f.odberatel_email}
                 onChange={(e) => zmen("odberatel_email", e.target.value)}
                 placeholder="Potřeba pro upomínky" />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="set-pole">
            <span className="set-label">Vystaveno</span>
            <input className="set-input" type="date" value={f.vystaveno}
                   onChange={(e) => {
                     zmen("vystaveno", e.target.value);
                     zmen("splatnost", splatnostZa(e.target.value, 14));
                   }} />
          </label>
          <label className="set-pole">
            <span className="set-label">Splatnost</span>
            <input className="set-input" type="date" value={f.splatnost}
                   onChange={(e) => zmen("splatnost", e.target.value)} />
          </label>
        </div>

        <p className="data vz-nadpis" style={{ marginTop: 16 }}>POLOŽKY</p>

        {polozky.map((p, i) => (
          <div key={i} className="fa-polozka">
            <input
              className="set-input fa-p-nazev"
              value={p.nazev}
              onChange={(e) => zmenPolozku(i, "nazev", e.target.value)}
              placeholder="Popis položky"
              aria-label={`Název položky ${i + 1}`}
            />
            <input
              className="set-input fa-p-cislo"
              type="number" inputMode="decimal"
              value={p.mnozstvi}
              onChange={(e) => zmenPolozku(i, "mnozstvi", Number(e.target.value))}
              aria-label="Množství"
            />
            <select
              className="set-input fa-p-jed"
              value={p.jednotka}
              onChange={(e) => zmenPolozku(i, "jednotka", e.target.value)}
              aria-label="Jednotka"
            >
              {JEDNOTKY.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
            <input
              className="set-input fa-p-cislo"
              type="number" inputMode="decimal"
              value={p.cena}
              onChange={(e) => zmenPolozku(i, "cena", Number(e.target.value))}
              aria-label="Cena za jednotku"
            />
            {platceDph && (
              <select
                className="set-input fa-p-jed"
                value={p.dph}
                onChange={(e) => zmenPolozku(i, "dph", Number(e.target.value))}
                aria-label="Sazba DPH"
              >
                {SAZBY_DPH.map((d) => <option key={d} value={d}>{d} %</option>)}
              </select>
            )}
            <span className="data fa-p-soucet">{kc(p.mnozstvi * p.cena)}</span>
            <button
              className="kal__smazat tap"
              onClick={() => setPolozky((s) => s.filter((_, j) => j !== i))}
              disabled={polozky.length === 1}
              aria-label="Odebrat položku"
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>
        ))}

        <button className="adm-btn" onClick={() => setPolozky((s) => [...s, prazdnaPolozka()])}>
          <i className="ti ti-plus" aria-hidden="true" />
          Další položka
        </button>

        <div className="fa-soucty">
          {platceDph && (
            <>
              <span><span>Základ</span>{kc(s.bezDph)}</span>
              <span><span>DPH</span>{kc(s.dph)}</span>
            </>
          )}
          <span className="fa-soucty__celkem"><span>Celkem</span>{kc(s.celkem)}</span>
        </div>

        <label className="set-pole">
          <span className="set-label">Poznámka</span>
          <textarea className="set-input" rows={2} value={f.poznamka}
                    onChange={(e) => zmen("poznamka", e.target.value)} style={{ resize: "vertical" }} />
        </label>

        <label className="vz-prepinac">
          <input type="checkbox" className="nt-prep" checked={f.opakovana}
                 onChange={(e) => zmen("opakovana", e.target.checked)} />
          Opakovaná faktura — systém připomene další měsíc
        </label>

        <div className="adm-actions">
          <button className="adm-btn adm-btn--primary" onClick={() => uloz(true)} disabled={bezi}>
            <i className="ti ti-send" aria-hidden="true" />
            {bezi ? "Ukládám…" : "Vystavit"}
          </button>
          <button className="adm-btn" onClick={() => uloz(false)} disabled={bezi}>
            Uložit jako koncept
          </button>
          <button className="adm-btn" onClick={onZavri}>Zrušit</button>
        </div>
      </aside>
    </>
  );
}
