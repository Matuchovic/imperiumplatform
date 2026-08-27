"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { ROLE_LABEL, type Role } from "@/components/admin/nav";
import {
  ODDELENI, UVAZKY, oddeleniZRole, delkaPusobeni, blizeSeVyroci,
} from "@/lib/personal/oddeleni";
import type { Efekt } from "@/lib/avatar";

export type Clovek = {
  id: string;
  name: string;
  role: string;
  pozice: string | null;
  telefon: string | null;
  nastup: string | null;
  ukonceni: string | null;
  uvazek: string | null;
  poznamka_hr: string | null;
  avatar_efekt: string | null;
};

const den = (iso: string) => new Date(iso).toLocaleDateString("cs-CZ");

export default function PersonalPanel({ lide }: { lide: Clovek[] }) {
  const router = useRouter();
  const [otevreny, setOtevreny] = useState<Clovek | null>(null);

  const aktivni = lide.filter((c) => !c.ukonceni);
  const byvali = lide.filter((c) => c.ukonceni);

  // Výročí do měsíce — připomínka dopředu, ne gratulace zpětně.
  const vyroci = aktivni
    .map((c) => ({ c, zbyva: blizeSeVyroci(c.nastup) }))
    .filter((x) => x.zbyva !== null)
    .sort((a, b) => (a.zbyva ?? 0) - (b.zbyva ?? 0));

  const skupiny = ODDELENI.map((o) => ({
    ...o,
    lide: aktivni.filter((c) => oddeleniZRole(c.role) === o.klic),
  })).filter((s) => s.lide.length > 0);

  return (
    <>
      <div className="adm-cards">
        <div className="tz-kpi">
          <p className="tz-kpi__k">LIDÍ</p>
          <p className="tz-kpi__n" style={{ color: "#dff5e8" }}>{aktivni.length}</p>
        </div>
        {ODDELENI.map((o) => (
          <div key={o.klic} className="tz-kpi">
            <p className="tz-kpi__k">{o.nazev.toUpperCase()}</p>
            <p className="tz-kpi__n" style={{ color: "#7ef0a8" }}>
              {aktivni.filter((c) => oddeleniZRole(c.role) === o.klic).length}
            </p>
          </div>
        ))}
      </div>

      {vyroci.length > 0 && (
        <div className="adm-alert">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Blíží se výročí nástupu.</span>{" "}
            <span className="adm-alert__detail">
              {vyroci.map((v) =>
                `${v.c.name} (${v.zbyva === 0 ? "dnes" : `za ${v.zbyva} dní`})`
              ).join(", ")}
            </span>
          </span>
        </div>
      )}

      {skupiny.length === 0 ? (
        <div className="tz-skupina">
          <p className="adm-panel__lead" style={{ margin: 0 }}>
            Zatím tu nikdo není. Členem se stane každý, komu přiřadíš jinou roli než klient.
          </p>
        </div>
      ) : (
        skupiny.map((s) => (
          <div key={s.klic} className="tz-skupina">
            <p className="tz-nadpis">
              <span className="tz-ikona"><i className={`ti ti-${s.ikona}`} aria-hidden="true" /></span>
              {s.nazev}
              <span className="tz-pocet">{s.popis.toUpperCase()}</span>
            </p>

            <div className="pe-mrizka">
              {s.lide.map((c) => (
                <button key={c.id} className="pe-karta" onClick={() => setOtevreny(c)}>
                  <Avatar jmeno={c.name} velikost={40} efekt={(c.avatar_efekt ?? "zadny") as Efekt} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="pe-jmeno">{c.name}</span>
                    <span className="pe-pozice">
                      {c.pozice || ROLE_LABEL[c.role as Role] || c.role}
                    </span>
                    <span className="pe-meta">
                      {c.nastup && <span>{delkaPusobeni(c.nastup)}</span>}
                      {c.uvazek && <span>{UVAZKY[c.uvazek]?.split(" ")[0]}</span>}
                    </span>
                  </span>
                  <i className="ti ti-chevron-right pe-sipka" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {byvali.length > 0 && (
        <div className="tz-skupina">
          <p className="tz-nadpis">
            <span className="tz-ikona" style={{ background: "rgba(143,163,150,.1)", color: "#8fa396", boxShadow: "none" }}>
              <i className="ti ti-archive" aria-hidden="true" />
            </span>
            Bývalí
            <span className="tz-pocet">{byvali.length}</span>
          </p>

          <div style={{ marginTop: 6 }}>
            {byvali.map((c) => (
              <button key={c.id} className="pe-radek" onClick={() => setOtevreny(c)}>
                <Avatar jmeno={c.name} velikost={30} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="pe-jmeno">{c.name}</span>
                  <span className="pe-meta">
                    <span>{c.pozice || ROLE_LABEL[c.role as Role]}</span>
                    <span>{delkaPusobeni(c.nastup, c.ukonceni)}</span>
                    <span>odešel {den(c.ukonceni!)}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {otevreny && (
        <DetailCloveka
          clovek={otevreny}
          onZavri={() => setOtevreny(null)}
          onUlozeno={() => { setOtevreny(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function DetailCloveka({
  clovek, onZavri, onUlozeno,
}: {
  clovek: Clovek; onZavri: () => void; onUlozeno: () => void;
}) {
  const [f, setF] = useState({
    pozice: clovek.pozice ?? "",
    telefon: clovek.telefon ?? "",
    nastup: clovek.nastup ?? "",
    ukonceni: clovek.ukonceni ?? "",
    uvazek: clovek.uvazek ?? "",
    poznamka_hr: clovek.poznamka_hr ?? "",
  });
  const [bezi, setBezi] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const zmen = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function uloz() {
    setBezi(true);
    setChyba(null);
    try {
      const r = await fetch("/api/personal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clovek.id, ...f }),
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
      <aside className="cl-panel" role="dialog" aria-label={clovek.name}>
        <div className="cl-panel__top">
          <Avatar jmeno={clovek.name} velikost={38} efekt={(clovek.avatar_efekt ?? "zadny") as Efekt} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="cl-panel__name">{clovek.name}</span>
            <span className="data cl-panel__id">
              {ROLE_LABEL[clovek.role as Role] ?? clovek.role} · {delkaPusobeni(clovek.nastup, clovek.ukonceni)}
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

        <label className="set-pole">
          <span className="set-label">Pozice</span>
          <input className="set-input" value={f.pozice} onChange={(e) => zmen("pozice", e.target.value)}
                 placeholder={ROLE_LABEL[clovek.role as Role] ?? ""} />
        </label>

        <label className="set-pole">
          <span className="set-label">Telefon</span>
          <input className="set-input" type="tel" value={f.telefon}
                 onChange={(e) => zmen("telefon", e.target.value)} placeholder="+420 …" />
        </label>

        <label className="set-pole">
          <span className="set-label">Typ úvazku</span>
          <select className="set-input" value={f.uvazek} onChange={(e) => zmen("uvazek", e.target.value)}>
            <option value="">Neuvedeno</option>
            {Object.entries(UVAZKY).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="set-pole">
            <span className="set-label">Nástup</span>
            <input className="set-input" type="date" value={f.nastup}
                   onChange={(e) => zmen("nastup", e.target.value)} />
          </label>
          <label className="set-pole">
            <span className="set-label">Ukončení</span>
            <input className="set-input" type="date" value={f.ukonceni}
                   onChange={(e) => zmen("ukonceni", e.target.value)} />
          </label>
        </div>

        {/* Vyplněné ukončení člověka přesune mezi bývalé — nemaže ho. */}
        {f.ukonceni && (
          <p className="adm-todo__note" style={{ marginTop: 0 }}>
            S vyplněným ukončením se člověk přesune mezi bývalé. Účet a role zůstávají —
            odebrat přístup je zvláštní krok v sekci Role.
          </p>
        )}

        <label className="set-pole">
          <span className="set-label">Poznámka</span>
          <textarea className="set-input" rows={3} value={f.poznamka_hr}
                    onChange={(e) => zmen("poznamka_hr", e.target.value)}
                    style={{ resize: "vertical" }} />
        </label>

        <div className="adm-actions">
          <button className="adm-btn adm-btn--primary" onClick={uloz} disabled={bezi}>
            {bezi ? "Ukládám…" : "Uložit"}
          </button>
          <button className="adm-btn" onClick={onZavri}>Zrušit</button>
        </div>
      </aside>
    </>
  );
}
