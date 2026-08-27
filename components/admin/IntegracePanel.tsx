"use client";

import { useCallback, useEffect, useState } from "react";

type StavF =
  | { pripojeno: true; ucet: string; nazev?: string }
  | { pripojeno: false; duvod: string };

type StavS =
  | { pripojeno: true; rezim: "test" | "ostry"; ucet?: string }
  | { pripojeno: false; duvod: string };

const PROMENNE = {
  fakturoid: ["FAKTUROID_SLUG", "FAKTUROID_CLIENT_ID", "FAKTUROID_CLIENT_SECRET", "FAKTUROID_EMAIL"],
  stripe: ["STRIPE_SECRET_KEY"],
};

export default function IntegracePanel() {
  const [f, setF] = useState<StavF | null>(null);
  const [s, setS] = useState<StavS | null>(null);
  const [bezi, setBezi] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const zjisti = useCallback(async () => {
    setBezi(true);
    setChyba(null);
    try {
      const r = await fetch("/api/integrace", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) setChyba(d?.error ?? `Ověření selhalo (${r.status}).`);
      else { setF(d.fakturoid); setS(d.stripe); }
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
    setBezi(false);
  }, []);

  useEffect(() => { zjisti(); }, [zjisti]);

  return (
    <div className="adm-panel">
      <p className="adm-panel__title">Napojené služby</p>
      <p className="adm-panel__lead">
        Přihlašovací údaje se zadávají do proměnných prostředí, ne sem. Do databáze
        vidí každý se service_role — klíč k fakturaci ani k platbám tam nepatří.
      </p>

      {chyba && (
        <div className="adm-alert adm-alert--bad" style={{ marginTop: 12 }}>
          <span className="adm-alert__text">
            <span className="adm-alert__title">{chyba}</span>
          </span>
        </div>
      )}

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>

        <div className="int-karta">
          <div className="int-hlava">
            <span className="int-ikona"><i className="ti ti-file-invoice" aria-hidden="true" /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="int-nazev">Fakturoid</span>
              <span className="int-role">Vystavování faktur klientům</span>
            </span>
            <span className={`data int-stav ${f?.pripojeno ? "int-stav--on" : ""}`}>
              {bezi && !f ? "ověřuji…" : f?.pripojeno ? "připojeno" : "nepřipojeno"}
            </span>
          </div>

          {f?.pripojeno ? (
            <p className="int-detail">
              Účet <strong>{f.nazev ?? f.ucet}</strong>. Faktury lze vystavovat z detailu klienta.
            </p>
          ) : (
            <>
              {f && <p className="int-detail int-detail--chyba">{f.duvod}</p>}
              <p className="int-navod">
                Ve Vercelu doplň tyto proměnné a nasaď znovu. Pověření získáš
                ve Fakturoidu v Nastavení → API.
              </p>
              <div className="int-promenne">
                {PROMENNE.fakturoid.map((p) => (
                  <span key={p} className="data int-prom">{p}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="int-karta">
          <div className="int-hlava">
            <span className="int-ikona"><i className="ti ti-credit-card" aria-hidden="true" /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="int-nazev">Stripe</span>
              <span className="int-role">Odkazy k platbě předplatného</span>
            </span>
            <span className={`data int-stav ${s?.pripojeno ? "int-stav--on" : ""}`}>
              {bezi && !s ? "ověřuji…" : s?.pripojeno ? "připojeno" : "nepřipojeno"}
            </span>
          </div>

          {s?.pripojeno ? (
            <>
              <p className="int-detail">
                Účet <strong>{s.ucet}</strong>.
              </p>
              {/* Rozlišení režimu je zásadní — v testovacím se skutečné
                  peníze nepohnou a je snadné si toho nevšimnout. */}
              <p className={`int-rezim ${s.rezim === "ostry" ? "int-rezim--ostry" : ""}`}>
                {s.rezim === "test"
                  ? "Testovací režim — skutečné platby neproběhnou."
                  : "Ostrý režim — platby jsou skutečné."}
              </p>
            </>
          ) : (
            <>
              {s && <p className="int-detail int-detail--chyba">{s.duvod}</p>}
              <p className="int-navod">
                Klíč najdeš ve Stripe v Developers → API keys. Začni testovacím
                (<span className="data">sk_test_…</span>), ostrý přidej až po ověření.
              </p>
              <div className="int-promenne">
                {PROMENNE.stripe.map((p) => (
                  <span key={p} className="data int-prom">{p}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="adm-actions">
        <button className="adm-btn" onClick={zjisti} disabled={bezi}>
          {bezi ? "Ověřuji…" : "Ověřit znovu"}
        </button>
      </div>

      <p className="adm-todo__note" style={{ marginTop: 14 }}>
        Systém nikdy nestrhává peníze sám. Stripe vytvoří odkaz, na který klient
        klikne — strhávání bez jeho vědomí je u sázkové služby nepřijatelné.
      </p>
    </div>
  );
}
