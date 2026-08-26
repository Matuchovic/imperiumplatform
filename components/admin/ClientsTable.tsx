"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export type ClientRow = {
  id: string;
  name: string;
  plan: string;
  bankroll: number;
  bands: string[];
  telegram: boolean;
  createdAt: string;
};

const czk = (n: number) => n.toLocaleString("cs-CZ");
const den = (iso: string) => new Date(iso).toLocaleDateString("cs-CZ");

export default function ClientsTable({
  rows, page, pageSize, total, query,
}: {
  rows: ClientRow[]; page: number; pageSize: number; total: number; query: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(query);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  function go(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) v ? sp.set(k, v) : sp.delete(k);
    router.push(`/dashboard/klienti?${sp.toString()}`);
  }

  return (
    <>
      <label className="cl-find">
        <i className="ti ti-search" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") go({ q, page: "" }); }}
          placeholder="Jméno klienta — potvrď Enterem"
          aria-label="Hledat v klientech"
        />
      </label>

      {rows.length === 0 ? (
        <div className="adm-panel">
          <p className="adm-panel__title">
            {query ? "Nikdo neodpovídá hledání" : "Zatím žádní klienti"}
          </p>
          <p className="adm-panel__lead" style={{ marginBottom: 0 }}>
            {query
              ? "Zkus jiné jméno nebo hledání zruš."
              : "Jakmile se někdo zaregistruje, objeví se tady. Ukázkové účty se nedoplňují."}
          </p>
        </div>
      ) : (
        <div className="scroll-x cl-wrap">
          <table className="cl-table">
            <thead>
              <tr>
                <th>Klient</th>
                <th>Plán</th>
                <th>Pásma</th>
                <th>Telegram</th>
                <th style={{ textAlign: "right" }}>Bankroll</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="cl-cell-who">
                    <span className="cl-who">
                      <span className="cl-pic">
                        {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span className="cl-name">{c.name}</span>
                        <span className="cl-mail">od {den(c.createdAt)}</span>
                      </span>
                    </span>
                  </td>
                  <td data-label="Plán">
                    <span className="data cl-tier">{c.plan.toUpperCase()}</span>
                  </td>
                  <td data-label="Pásma" className="data cl-dim">
                    {c.bands.length ? c.bands.join(", ") : "—"}
                  </td>
                  <td data-label="Telegram">
                    <span className="cl-state" style={{ color: c.telegram ? "#7ef0a8" : "#5b6c61" }}>
                      <span className="cl-dot" style={{ background: c.telegram ? "#7ef0a8" : "#3a453e" }} />
                      {c.telegram ? "napojen" : "chybí"}
                    </span>
                  </td>
                  <td className="data cl-paid" data-label="Bankroll">
                    {czk(c.bankroll)} Kč
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="adm-actions">
          <button className="adm-btn" disabled={page <= 1}
                  onClick={() => go({ page: String(page - 1) })}>
            Předchozí
          </button>
          <span className="data" style={{ alignSelf: "center", fontSize: 12, color: "#5b6c61" }}>
            {page} / {pages}
          </span>
          <button className="adm-btn" disabled={page >= pages}
                  onClick={() => go({ page: String(page + 1) })}>
            Další
          </button>
        </div>
      )}
    </>
  );
}
