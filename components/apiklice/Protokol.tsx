"use client";

import { useCallback, useEffect, useState } from "react";
import { DRUHY } from "@/lib/apiklice/druhy";

/**
 * Protokol volání a podezření.
 *
 * Bez něj se nedá zjistit, proč formulář na webu nefunguje —
 * jestli klíč nesedí, doména neprošla, nebo přišla neúplná data.
 */

type Volani = {
  id: number; klic_id: number | null; cesta: string; metoda: string;
  stav: number; ip: string | null; puvod: string | null;
  trvani_ms: number | null; chyba: string | null; created_at: string;
};

type Podezreni = {
  id: number; klic_id: number | null; druh: string;
  popis: string; created_at: string;
};

const cas = (iso: string) =>
  new Date(iso).toLocaleString("cs-CZ", {
    day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

export default function Protokol() {
  const [volani, setVolani] = useState<Volani[]>([]);
  const [podezreni, setPodezreni] = useState<Podezreni[]>([]);
  const [jenChyby, setJenChyby] = useState(false);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch(`/api/apiklice/protokol${jenChyby ? "?chyby=1" : ""}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) return;
      setVolani(d.volani ?? []);
      setPodezreni(d.podezreni ?? []);
    } catch { /* příště */ }
  }, [jenChyby]);

  useEffect(() => {
    nacti();
    const t = setInterval(() => { if (!document.hidden) nacti(); }, 20_000);
    return () => clearInterval(t);
  }, [nacti]);

  async function vyres(id: number) {
    setPodezreni((s) => s.filter((p) => p.id !== id));
    await fetch("/api/apiklice/protokol", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => nacti());
  }

  return (
    <>
      {podezreni.length > 0 && (
        <div className="adm-panel">
          <p className="adm-panel__title">Podezřelé chování</p>
          <p className="adm-panel__lead">
            Ukradený klíč se pozná podle toho, že se chová jinak. Projdi to
            a odškrtni, co je v pořádku.
          </p>
          {podezreni.map((p) => {
            const d = DRUHY[p.druh as keyof typeof DRUHY];
            return (
              <div key={p.id} className="pk-podezreni">
                <span className="pk-znak">
                  <i className="ti ti-alert-triangle" aria-hidden="true" />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="pk-nazev">{d?.nazev ?? p.druh}</span>
                  <span className="pk-popis">{p.popis}</span>
                  <span className="data pk-cas">{cas(p.created_at)}</span>
                </span>
                <button className="adm-btn" onClick={() => vyres(p.id)}>
                  <i className="ti ti-check" aria-hidden="true" />
                  V pořádku
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="adm-actions" style={{ marginTop: 0 }}>
        <button
          className={`adm-btn ${jenChyby ? "adm-btn--primary" : ""}`}
          onClick={() => setJenChyby((c) => !c)}
        >
          <i className="ti ti-filter" aria-hidden="true" />
          {jenChyby ? "Zobrazit vše" : "Jen chyby"}
        </button>
        <button className="adm-btn" onClick={nacti}>
          <i className="ti ti-refresh" aria-hidden="true" />
          Obnovit
        </button>
      </div>

      {volani.length === 0 ? (
        <div className="tz-skupina">
          <p className="adm-panel__lead" style={{ margin: 0 }}>
            {jenChyby ? "Žádné chyby. To je dobře." : "Zatím žádná volání."}
          </p>
        </div>
      ) : (
        <div className="scroll-x" style={{ marginTop: 14 }}>
          <table className="pk-tab">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Čas</th>
                <th style={{ textAlign: "left" }}>Volání</th>
                <th>Stav</th>
                <th style={{ textAlign: "left" }}>Adresa</th>
                <th>Trvání</th>
                <th style={{ textAlign: "left" }}>Chyba</th>
              </tr>
            </thead>
            <tbody>
              {volani.map((v) => (
                <tr key={v.id} className={v.stav >= 400 ? "pk-radek--chyba" : ""}>
                  <td style={{ textAlign: "left" }} className="data pk-cas-bunka">{cas(v.created_at)}</td>
                  <td style={{ textAlign: "left" }}>
                    <span className={`dk-metoda dk-metoda--${v.metoda.toLowerCase()}`}>{v.metoda}</span>
                    <span className="data" style={{ marginLeft: 8 }}>{v.cesta}</span>
                  </td>
                  <td>
                    <span className="data" style={{ color: v.stav >= 400 ? "#ff8a8a" : "#7ef0a8" }}>
                      {v.stav}
                    </span>
                  </td>
                  <td style={{ textAlign: "left" }} className="data pk-tlum">{v.ip ?? "—"}</td>
                  <td className="data pk-tlum">{v.trvani_ms ? `${v.trvani_ms} ms` : "—"}</td>
                  <td style={{ textAlign: "left" }} className="pk-chyba">{v.chyba ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="data" style={{
        margin: "14px 0 0", fontSize: 10, letterSpacing: "0.1em", color: "#4c6d5b",
      }}>
        POSLEDNÍCH 200 VOLÁNÍ · OBNOVUJE SE PO 20 VTEŘINÁCH
      </p>
    </>
  );
}
