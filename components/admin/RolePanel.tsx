"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABEL, ROLE_BARVA, ROLE_PORADI, type Role } from "./nav";

export type Clen = { id: string; name: string; role: Role };

/** Co která role vidí. Musí odpovídat rolím v NAV. */
const MATICE: [string, Role[]][] = [
  ["Přehled", ROLE_PORADI],
  ["Klienti", ["ceo", "vyvojar", "manazer"]],
  ["Databáze kontaktů", ["ceo", "vyvojar", "marketing", "scout"]],
  ["Analytika", ["ceo", "vyvojar", "manazer", "marketing", "ucetni"]],
  ["Úkoly", ["ceo", "vyvojar", "manazer", "marketing", "scout"]],
  ["Support", ["ceo", "vyvojar", "manazer", "marketing"]],
  ["Motor hodnoty", ["ceo", "vyvojar", "manazer"]],
  ["Automatizace", ["ceo", "vyvojar"]],
  ["Email a SMS", ["ceo", "vyvojar", "marketing"]],
  ["Nastavení", ["ceo", "vyvojar", "klient"]],
  ["Role", ["ceo", "vyvojar"]],
  ["Audit log", ["ceo", "vyvojar", "ucetni"]],
];

const iniciály = (jmeno: string) =>
  jmeno.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

export default function RolePanel({ tym, jaId }: { tym: Clen[]; jaId: string }) {
  const router = useRouter();
  const [seznam, setSeznam] = useState(tym);
  const [busy, setBusy] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [zvyraznit, setZvyraznit] = useState<Role>("vyvojar");

  async function zmen(clen: Clen, role: Role) {
    setBusy(clen.id);
    setChyba(null);
    const puvodni = clen.role;

    // Optimisticky, ať tabulka nepočká na síť.
    setSeznam((s) => s.map((c) => (c.id === clen.id ? { ...c, role } : c)));
    setZvyraznit(role);

    try {
      const res = await fetch("/api/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: clen.id, role }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSeznam((s) => s.map((c) => (c.id === clen.id ? { ...c, role: puvodni } : c)));
        setChyba(data?.error ?? `Změna selhala (${res.status}).`);
      } else {
        router.refresh();
      }
    } catch {
      setSeznam((s) => s.map((c) => (c.id === clen.id ? { ...c, role: puvodni } : c)));
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setBusy(null);
  }

  return (
    <>
      {chyba && (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text">
            <span className="adm-alert__title">{chyba}</span>
          </span>
        </div>
      )}

      <div className="adm-panel">
        <p className="adm-panel__title">Tým</p>
        {seznam.length === 0 ? (
          <p className="adm-panel__lead" style={{ marginBottom: 0 }}>
            Zatím tu nikdo není. Členem týmu se stane každý, komu přiřadíš jinou roli než klient.
          </p>
        ) : (
          <div style={{ marginTop: 10 }}>
            {seznam.map((c) => (
              <div key={c.id} className="rl-row">
                <span className="rl-who">
                  <span
                    className="rl-pic"
                    style={{ background: `${ROLE_BARVA[c.role]}22`, color: ROLE_BARVA[c.role] }}
                  >
                    {iniciály(c.name)}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="rl-name">
                      {c.name}
                      {c.id === jaId && <span className="rl-ja"> to jsi ty</span>}
                    </span>
                    <span className="rl-mail" style={{ color: ROLE_BARVA[c.role] }}>
                      {ROLE_LABEL[c.role]}
                    </span>
                  </span>
                </span>

                <select
                  className="rl-sel"
                  value={c.role}
                  disabled={busy === c.id}
                  aria-label={`Role pro ${c.name}`}
                  onChange={(e) => zmen(c, e.target.value as Role)}
                >
                  {ROLE_PORADI.map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="adm-panel">
        <p className="adm-panel__title">Co která role vidí</p>
        <p className="adm-panel__lead">
          Sekce, kterou role nemá, se jí v navigaci vůbec nezobrazí — nejde k ní ani přímým odkazem.
        </p>

        {/* Na telefonu se sedm sloupců nevejde. Místo tabulky výběr role
            a seznam sekcí — stejná informace, jiný tvar. */}
        <div className="rl-picker">
          {ROLE_PORADI.map((r) => (
            <button
              key={r}
              className={`rl-chip ${r === zvyraznit ? "rl-chip--on" : ""}`}
              onClick={() => setZvyraznit(r)}
              aria-pressed={r === zvyraznit}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>

        <ul className="rl-list">
          {MATICE.map(([sekce, role]) => {
            const ma = role.includes(zvyraznit);
            return (
              <li key={sekce} className={`rl-item ${ma ? "" : "rl-item--ne"}`}>
                <i className={`ti ti-${ma ? "check" : "minus"}`} aria-hidden="true" />
                <span>{sekce}</span>
              </li>
            );
          })}
        </ul>

        <div className="rl-mx-wrap scroll-x">
          <table className="rl-mx">
            <thead>
              <tr>
                <th>Sekce</th>
                {ROLE_PORADI.map((r) => (
                  <th key={r} style={r === zvyraznit ? { color: ROLE_BARVA[r] } : undefined}>
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATICE.map(([sekce, role]) => (
                <tr key={sekce}>
                  <td>{sekce}</td>
                  {ROLE_PORADI.map((r) => (
                    <td
                      key={r}
                      style={r === zvyraznit ? { background: "rgba(126,240,168,.05)" } : undefined}
                    >
                      <span style={{ color: role.includes(r) ? ROLE_BARVA[r] : "#2b352e" }}>
                        {role.includes(r) ? "●" : "—"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
