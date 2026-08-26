"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export type Kontakt = {
  id: string;
  company_name: string;
  ico: string | null;
  industry: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  ucel: string;
};

const UCEL: Record<string, { label: string; color: string; bg: string }> = {
  interni_evidence:  { label: "Jen evidence",    color: "#8fa396", bg: "rgba(143,163,150,.12)" },
  obchodni_kontakt:  { label: "Obchodní kontakt", color: "#5eead4", bg: "rgba(94,234,212,.12)" },
  osloveni_povoleno: { label: "Oslovení povoleno", color: "#7ef0a8", bg: "rgba(126,240,168,.12)" },
};

export default function KontaktyTable({
  rows, page, pageSize, total, q, obor, mesto, obory,
}: {
  rows: Kontakt[]; page: number; pageSize: number; total: number;
  q: string; obor: string; mesto: string; obory: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [hledat, setHledat] = useState(q);
  const [mestoIn, setMestoIn] = useState(mesto);
  const [open, setOpen] = useState<Kontakt | null>(null);

  const stran = Math.max(1, Math.ceil(total / pageSize));

  function jdi(zmeny: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(zmeny)) v ? sp.set(k, v) : sp.delete(k);
    router.push(`/dashboard/kontakty?${sp.toString()}`);
  }

  const potvrd = () => jdi({ q: hledat, mesto: mestoIn, page: "" });

  return (
    <>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <label className="cl-find">
          <i className="ti ti-search" aria-hidden="true" />
          <input
            type="search" value={hledat}
            onChange={(e) => setHledat(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") potvrd(); }}
            placeholder="Název nebo IČO — Enter"
            aria-label="Hledat v kontaktech"
          />
        </label>

        <label className="cl-find">
          <i className="ti ti-map-pin" aria-hidden="true" />
          <input
            type="search" value={mestoIn}
            onChange={(e) => setMestoIn(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") potvrd(); }}
            placeholder="Město"
            aria-label="Filtrovat podle města"
          />
        </label>

        <select
          className="set-input"
          value={obor}
          onChange={(e) => jdi({ obor: e.target.value, page: "" })}
          aria-label="Obor"
        >
          <option value="">Všechny obory</option>
          {obory.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="adm-panel">
          <p className="adm-panel__title">Nic neodpovídá</p>
          <p className="adm-panel__lead" style={{ marginBottom: 0 }}>
            {q || obor || mesto
              ? "Zkus jiné hledání nebo filtry zruš."
              : "Tabulka je prázdná. Nahraj CSV export ze scout_leads."}
          </p>
        </div>
      ) : (
        <div className="scroll-x cl-wrap">
          <table className="cl-table">
            <thead>
              <tr>
                <th>Firma</th>
                <th>Obor</th>
                <th>Město</th>
                <th>Kontakt</th>
                <th>Účel</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id} onClick={() => setOpen(k)}>
                  <td className="cl-cell-who">
                    <span className="cl-who">
                      <span className="cl-pic">
                        {k.company_name.replace(/[^A-Za-zÁ-Žá-ž ]/g, "").trim().split(" ").map((s) => s[0]).slice(0, 2).join("")}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span className="cl-name">{k.company_name}</span>
                        <span className="cl-mail">{k.ico ? `IČO ${k.ico}` : "bez IČO"}</span>
                      </span>
                    </span>
                  </td>
                  <td data-label="Obor" className="cl-dim">{k.industry ?? "—"}</td>
                  <td data-label="Město" className="cl-dim">{k.city ?? "—"}</td>
                  <td data-label="Kontakt" className="cl-dim">
                    {k.email ? <span style={{ color: "#7ef0a8" }}>e-mail</span>
                      : k.phone ? <span style={{ color: "#5eead4" }}>telefon</span>
                      : "—"}
                  </td>
                  <td data-label="Účel">
                    <span
                      className="data cl-tier"
                      style={{
                        background: (UCEL[k.ucel] ?? UCEL.interni_evidence).bg,
                        color: (UCEL[k.ucel] ?? UCEL.interni_evidence).color,
                      }}
                    >
                      {(UCEL[k.ucel] ?? UCEL.interni_evidence).label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stran > 1 && (
        <div className="adm-actions">
          <button className="adm-btn" disabled={page <= 1} onClick={() => jdi({ page: String(page - 1) })}>
            Předchozí
          </button>
          <span className="data" style={{ alignSelf: "center", fontSize: 12, color: "#5b6c61" }}>
            {page} / {stran.toLocaleString("cs-CZ")}
          </span>
          <button className="adm-btn" disabled={page >= stran} onClick={() => jdi({ page: String(page + 1) })}>
            Další
          </button>
        </div>
      )}

      {open && (
        <>
          <div className="cl-scrim" onClick={() => setOpen(null)} />
          <aside className="cl-panel" role="dialog" aria-label={`Detail ${open.company_name}`}>
            <div className="cl-panel__top">
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="cl-panel__name">{open.company_name}</span>
                <span className="data cl-panel__id">{open.ico ? `IČO ${open.ico}` : "bez IČO"}</span>
              </span>
              <button onClick={() => setOpen(null)} className="tap cl-close" aria-label="Zavřít">
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>

            <div className="cl-group">
              <p className="cl-group__title">Firma</p>
              <div className="cl-line"><span className="cl-line__k">Obor</span><span className="data cl-line__v">{open.industry ?? "—"}</span></div>
              <div className="cl-line"><span className="cl-line__k">Město</span><span className="data cl-line__v">{open.city ?? "—"}</span></div>
              <div className="cl-line"><span className="cl-line__k">Adresa</span><span className="data cl-line__v">{open.address ?? "—"}</span></div>
              <div className="cl-line"><span className="cl-line__k">Web</span><span className="data cl-line__v">{open.website ?? "—"}</span></div>
            </div>

            <div className="cl-group">
              <p className="cl-group__title">Kontakt</p>
              <div className="cl-line"><span className="cl-line__k">E-mail</span><span className="data cl-line__v">{open.email ?? "—"}</span></div>
              <div className="cl-line"><span className="cl-line__k">Telefon</span><span className="data cl-line__v">{open.phone ?? "—"}</span></div>
            </div>

            <div className="cl-group">
              <p className="cl-group__title">Původ záznamu</p>
              <div className="cl-line"><span className="cl-line__k">Zdroj</span><span className="data cl-line__v">ARES</span></div>
              <div className="cl-line">
                <span className="cl-line__k">Účel</span>
                <span className="data cl-line__v" style={{ color: (UCEL[open.ucel] ?? UCEL.interni_evidence).color }}>
                  {(UCEL[open.ucel] ?? UCEL.interni_evidence).label}
                </span>
              </div>
              {open.ucel === "interni_evidence" && (
                <p className="cl-memo" style={{ marginTop: 8 }}>
                  Záznam je vedený jako interní evidence. Pro oslovení je potřeba
                  změnit účel — a k tomu mít právní titul.
                </p>
              )}
            </div>

            {open.ico && (
              <div className="adm-actions" style={{ marginTop: 18 }}>
                <a
                  className="adm-btn"
                  href={`https://ares.gov.cz/ekonomicke-subjekty?ico=${open.ico}`}
                  target="_blank" rel="noopener noreferrer"
                >
                  <i className="ti ti-external-link" aria-hidden="true" />
                  Ověřit v ARES
                </a>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}
