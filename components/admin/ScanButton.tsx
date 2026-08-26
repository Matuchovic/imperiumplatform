"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  provider: string;
  live: boolean;
  matches: number;
  books: number;
  found: number;
  leaguesAvailable: string[];
  leaguesScanned: string[];
  ms: number;
};

export default function ScanButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    setRes(null);
    try {
      const r = await fetch("/api/engine/run", { method: "POST" });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        setErr(data?.error ?? `Hledání selhalo (${r.status}).`);
      } else {
        setRes(data);
        router.refresh();
      }
    } catch {
      setErr("Nepodařilo se spojit se serverem.");
    }
    setBusy(false);
  }

  return (
    <>
      <div className="adm-actions" style={{ marginTop: 0 }}>
        <button className="adm-btn adm-btn--primary" onClick={run} disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" />
              Hledám…
            </>
          ) : (
            <>
              <i className="ti ti-radar" aria-hidden="true" />
              Hledat hodnotu
            </>
          )}
        </button>
      </div>

      {err && (
        <div className="adm-alert adm-alert--bad" style={{ marginTop: 12 }}>
          <span className="adm-alert__text">
            <span className="adm-alert__title">{err}</span>
          </span>
        </div>
      )}

      {res && (
        <div className="scan-out">
          <div className="scan-out__row">
            <span><span>Zdroj</span> {res.provider}{res.live ? "" : " (ukázková data)"}</span>
            <span><span>Zápasů</span> {res.matches}</span>
            <span><span>Nabídek</span> {res.books}</span>
            <span><span>Nálezů</span> {res.found}</span>
            <span><span>Trvalo</span> {(res.ms / 1000).toFixed(1)} s</span>
          </div>

          {res.leaguesAvailable.length > 0 && (
            <p className="scan-out__leagues">
              Dnes se hraje v <strong>{res.leaguesAvailable.length}</strong> soutěžích.
              Prohledáno {res.leaguesScanned.length}: {res.leaguesScanned.join(", ")}.
              {res.leaguesAvailable.length > res.leaguesScanned.length && (
                <> Další běh vezme následující — kvóta poskytovatele nedovolí projít všechny naráz.</>
              )}
            </p>
          )}

          {res.found === 0 && res.books > 0 && (
            <p className="scan-out__note">
              Hodnota dnes v prohledaných soutěžích není. To je běžný stav — trh ji
              většinu času nenabízí a doplňovat tipy bez výhody by celou službu znehodnotilo.
            </p>
          )}
        </div>
      )}
    </>
  );
}
