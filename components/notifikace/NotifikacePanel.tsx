"use client";

import { useCallback, useEffect, useState } from "react";
import { DRUHY, VYCHOZI_VOLBY, type Druh, type Volby } from "@/lib/push/druhy";

/**
 * Nastavení notifikací.
 *
 * Povolení se dává na každém zařízení zvlášť — odběr patří
 * prohlížeči, ne účtu. Proto seznam zařízení dole.
 */

type Zarizeni = { id: number; zarizeni: string | null; created_at: string };

const den = (iso: string) => new Date(iso).toLocaleDateString("cs-CZ");

/** Klíč z base64url do pole bajtů, jak ho čeká pushManager. */
function naBajty(base64: string): Uint8Array {
  const doplneno = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(doplneno);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function NotifikacePanel() {
  const [volby, setVolby] = useState<Volby>(VYCHOZI_VOLBY);
  const [zarizeni, setZarizeni] = useState<Zarizeni[]>([]);
  const [klic, setKlic] = useState<string | null>(null);
  const [pripraveno, setPripraveno] = useState(true);
  const [povoleno, setPovoleno] = useState<NotificationPermission | "nepodporovano">("default");
  /** Má tenhle prohlížeč odběr uložený u nás? Povolení samo nestačí. */
  const [prihlaseno, setPrihlaseno] = useState<boolean | null>(null);
  const [bezi, setBezi] = useState(false);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch("/api/push", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setChyba(d?.error ?? "Načtení selhalo."); return; }
      setVolby(d.volby);
      setZarizeni(d.zarizeni ?? []);
      setKlic(d.verejnyKlic);
      setPripraveno(d.pripraveno);
      setChyba(null);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }, []);

  useEffect(() => {
    const podporovano = typeof Notification !== "undefined" && "serviceWorker" in navigator;
    setPovoleno(podporovano ? Notification.permission : "nepodporovano");
    nacti();

    if (!podporovano) { setPrihlaseno(false); return; }

    // Povolení je stav prohlížeče, odběr je záznam u nás. Když se
    // rozejdou — třeba po smazání aplikace nebo změně klíčů —
    // panel by tvrdil, že to funguje, a ono ne.
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((o) => setPrihlaseno(Boolean(o)))
      .catch(() => setPrihlaseno(false));
  }, [nacti]);

  async function povol() {
    if (!klic) { setChyba("Chybí veřejný klíč VAPID."); return; }
    setBezi(true);
    setChyba(null);

    try {
      // Povolení musí vzejít z kliknutí — prohlížeč ho jinak odmítne.
      const stav = await Notification.requestPermission();
      setPovoleno(stav);
      if (stav !== "granted") {
        setChyba("Notifikace jsi nepovolil. Zapnout to jde v nastavení prohlížeče.");
        setBezi(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const odber = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: naBajty(klic) as BufferSource,
      });

      const r = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(odber.toJSON()),
      });
      if (!r.ok) setChyba("Odběr se nepodařilo uložit.");
      else { setHlaska("Zařízení přihlášeno."); setPrihlaseno(true); nacti(); }
    } catch (err) {
      setChyba(`Povolení selhalo: ${String(err).slice(0, 100)}`);
    }
    setBezi(false);
  }

  async function uloz(nove: Volby) {
    setVolby(nove);
    await fetch("/api/push", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nove),
    }).catch(() => setChyba("Uložení selhalo."));
  }

  async function zkouska() {
    setBezi(true);
    const r = await fetch("/api/push/test", { method: "POST" });
    const d = await r.json().catch(() => null);
    setHlaska(d?.zprava ?? "Zkouška selhala.");
    setBezi(false);
  }

  async function odeber(id: number) {
    setZarizeni((z) => z.filter((x) => x.id !== id));
    await fetch(`/api/push?id=${id}`, { method: "DELETE" }).catch(() => nacti());

    // Zrušit jen záznam nestačí — prohlížeč by odběr držel dál
    // a znovupovolení by vrátilo tentýž neplatný endpoint.
    try {
      const reg = await navigator.serviceWorker.ready;
      const o = await reg.pushManager.getSubscription();
      await o?.unsubscribe();
      setPrihlaseno(false);
    } catch { /* zařízení nemusí být tohle */ }
  }

  if (!pripraveno) {
    return (
      <div className="adm-alert adm-alert--warn">
        <span className="adm-alert__text">
          <span className="adm-alert__title">Notifikace nejsou nastavené.</span>{" "}
          <span className="adm-alert__detail">
            Ve Vercelu doplň <span className="data">NEXT_PUBLIC_VAPID_KLIC</span> a{" "}
            <span className="data">VAPID_TAJNY_KLIC</span>. Klíče vygeneruješ příkazem{" "}
            <span className="data">npx web-push generate-vapid-keys</span>.
          </span>
        </span>
      </div>
    );
  }

  return (
    <>
      {chyba && (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text"><span className="adm-alert__title">{chyba}</span></span>
        </div>
      )}
      {hlaska && (
        <div className="adm-alert">
          <span className="adm-alert__text"><span className="adm-alert__title">{hlaska}</span></span>
        </div>
      )}

      {povoleno === "nepodporovano" ? (
        <div className="adm-alert adm-alert--warn">
          <span className="adm-alert__text">
            <span className="adm-alert__title">Tenhle prohlížeč notifikace neumí.</span>{" "}
            <span className="adm-alert__detail">
              Na iPhonu je potřeba aplikaci nejdřív přidat na plochu — ze Safari nechodí.
            </span>
          </span>
        </div>
      ) : povoleno !== "granted" || prihlaseno === false ? (
        <div className="nt-vyzva">
          <span className="nt-vyzva__znak">
            <i className="ti ti-bell" aria-hidden="true" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="nt-vyzva__nadpis">
              {povoleno === "granted"
                ? "Zařízení není přihlášené k odběru"
                : "Na tomhle zařízení notifikace nechodí"}
            </p>
            <p className="nt-vyzva__popis">
              {povoleno === "granted"
                ? "Prohlížeč notifikace povolil, ale odběr u nás uložený není. Stačí klepnout na Povolit."
                : "Povolení se dává na každém zařízení zvlášť. Na iPhonu funguje jen po přidání aplikace na plochu."}
            </p>
          </div>
          <button className="adm-btn adm-btn--primary" onClick={povol} disabled={bezi}>
            {bezi ? "Povoluji…" : "Povolit"}
          </button>
        </div>
      ) : (
        <div className="nt-vyzva nt-vyzva--ok">
          <span className="nt-vyzva__znak nt-vyzva__znak--ok">
            <i className="ti ti-bell-ringing" aria-hidden="true" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="nt-vyzva__nadpis">Notifikace na tomhle zařízení fungují</p>
            <p className="nt-vyzva__popis">Vyzkoušej si, jak vypadají.</p>
          </div>
          <button className="adm-btn" onClick={zkouska} disabled={bezi}>
            {bezi ? "Posílám…" : "Poslat zkušební"}
          </button>
        </div>
      )}

      <div className="adm-panel">
        <p className="adm-panel__title">Co má chodit</p>
        <p className="adm-panel__lead">
          Volby platí pro všechna tvoje zařízení najednou.
        </p>

        <div style={{ marginTop: 8 }}>
          {DRUHY.map((d) => (
            <label key={d.klic} className="nt-radek">
              <span className="nt-ikona">
                <i className={`ti ti-${d.ikona}`} aria-hidden="true" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="nt-nazev">{d.nazev}</span>
                <span className="nt-popis">{d.popis}</span>
              </span>
              <input
                type="checkbox"
                className="nt-prep"
                checked={volby[d.klic as Druh]}
                onChange={(e) => uloz({ ...volby, [d.klic]: e.target.checked })}
                aria-label={d.nazev}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="adm-panel">
        <p className="adm-panel__title">Tiché hodiny</p>
        <p className="adm-panel__lead">
          V tomhle rozsahu nedorazí nic. Rozsah přes půlnoc je v pořádku — zadej třeba
          od 22:00 do 07:00.
        </p>

        <div className="nt-ticho">
          <label className="set-pole" style={{ margin: 0 }}>
            <span className="set-label">Od</span>
            <input
              className="set-input" type="time"
              value={volby.ticho_od ?? ""}
              onChange={(e) => uloz({ ...volby, ticho_od: e.target.value || null })}
            />
          </label>
          <label className="set-pole" style={{ margin: 0 }}>
            <span className="set-label">Do</span>
            <input
              className="set-input" type="time"
              value={volby.ticho_do ?? ""}
              onChange={(e) => uloz({ ...volby, ticho_do: e.target.value || null })}
            />
          </label>
          {(volby.ticho_od || volby.ticho_do) && (
            <button
              className="adm-btn"
              onClick={() => uloz({ ...volby, ticho_od: null, ticho_do: null })}
            >
              Zrušit
            </button>
          )}
        </div>
      </div>

      <div className="adm-panel">
        <p className="adm-panel__title">Přihlášená zařízení</p>
        <p className="adm-panel__lead">
          Každý prohlížeč a telefon má vlastní odběr. Odebráním sem přestanou chodit.
        </p>

        <div style={{ marginTop: 8 }}>
          {zarizeni.length === 0 ? (
            <p className="kal__prazdno">Zatím žádné. Povol notifikace tlačítkem nahoře.</p>
          ) : (
            zarizeni.map((z) => (
              <div key={z.id} className="nt-zar">
                <span className="nt-ikona">
                  <i className="ti ti-device-mobile" aria-hidden="true" />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="nt-nazev">{z.zarizeni ?? "neznámé zařízení"}</span>
                  <span className="data nt-kdy">přihlášeno {den(z.created_at)}</span>
                </span>
                <button className="tz-btn tz-btn--zla" onClick={() => odeber(z.id)} aria-label="Odebrat">
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
