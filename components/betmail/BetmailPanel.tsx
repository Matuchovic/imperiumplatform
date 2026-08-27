"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import {
  SLOZKY, PRIORITY, REAKCE, kdyZprava, nahled,
  predmetOdpovedi, predmetPreposlani, type Slozka,
} from "@/lib/betmail/zpravy";

/**
 * Betmail.
 *
 * Seznam vlevo, zpráva vpravo — na desktopu vedle sebe, na telefonu
 * přes sebe. Otevřená zpráva se označí přečtenou sama; zvláštní
 * tlačítko na to nikdo nehledá.
 */

type Zprava = {
  id: number;
  predmet: string;
  telo: string;
  odesilatel: string;
  odesilatel_jmeno: string | null;
  prijemce: string;
  priorita: string;
  odpoved_na: number | null;
  prilohy: number[];
  precteno_at: string | null;
  archivovano: boolean;
  created_at: string;
};

type Clovek = { id: string; name: string; role: string };
type Reakce = { zprava_id: number; user_id: string; znak: string };

export default function BetmailPanel({ jaId }: { jaId: string }) {
  const [slozka, setSlozka] = useState<Slozka>("dorucene");
  const [zpravy, setZpravy] = useState<Zprava[]>([]);
  const [lide, setLide] = useState<Clovek[]>([]);
  const [reakce, setReakce] = useState<Reakce[]>([]);
  const [otevrena, setOtevrena] = useState<Zprava | null>(null);
  const [psani, setPsani] = useState<null | {
    predmet: string; prijemci: string[]; telo: string; priorita: string; odpoved_na: number | null;
  }>(null);
  const [hledat, setHledat] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch(`/api/betmail?slozka=${slozka}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setChyba(d?.error ?? "Načtení selhalo."); return; }
      setZpravy(d.zpravy ?? []);
      setLide(d.lide ?? []);
      setReakce(d.reakce ?? []);
      setChyba(null);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }, [slozka]);

  useEffect(() => { nacti(); }, [nacti]);

  const neprectenych = useMemo(
    () => zpravy.filter((z) => !z.precteno_at && z.prijemce === jaId).length,
    [zpravy, jaId]
  );

  const videt = useMemo(() => {
    const f = hledat.trim().toLowerCase();
    if (!f) return zpravy;
    return zpravy.filter((z) =>
      [z.predmet, z.telo, z.odesilatel_jmeno].some((x) => x?.toLowerCase().includes(f))
    );
  }, [zpravy, hledat]);

  async function otevri(z: Zprava) {
    setOtevrena(z);
    // Otevřením se označí přečtená — zvláštní tlačítko nikdo nehledá.
    if (!z.precteno_at && z.prijemce === jaId) {
      setZpravy((s) => s.map((x) => (x.id === z.id ? { ...x, precteno_at: new Date().toISOString() } : x)));
      await akce(z.id, "precteno", false);
    }
  }

  async function akce(id: number, a: string, obnovit = true) {
    await fetch("/api/betmail", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, akce: a }),
    }).catch(() => setChyba("Akce selhala."));
    if (obnovit) { setOtevrena(null); nacti(); }
  }

  async function prepniReakci(id: number, znak: string) {
    const mam = reakce.some((r) => r.zprava_id === id && r.user_id === jaId && r.znak === znak);
    setReakce((s) => mam
      ? s.filter((r) => !(r.zprava_id === id && r.user_id === jaId && r.znak === znak))
      : [...s, { zprava_id: id, user_id: jaId, znak }]);

    await fetch("/api/betmail/reakce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, znak }),
    }).catch(() => nacti());
  }

  async function odesli() {
    if (!psani) return;
    const r = await fetch("/api/betmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(psani),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) { setChyba(d?.error ?? "Odeslání selhalo."); return; }
    setPsani(null);
    setOtevrena(null);
    nacti();
  }

  const jmeno = (id: string) =>
    id === jaId ? "já" : lide.find((l) => l.id === id)?.name ?? "někdo";

  return (
    <>
      {chyba && (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text">
            <span className="adm-alert__title">{chyba}</span>{" "}
            <span className="adm-alert__detail">Spustil jsi supabase/betmail.sql?</span>
          </span>
        </div>
      )}

      <div className="adm-actions" style={{ marginTop: 0 }}>
        <button
          className="adm-btn adm-btn--primary"
          onClick={() => setPsani({ predmet: "", prijemci: [], telo: "", priorita: "bezna", odpoved_na: null })}
        >
          <i className="ti ti-pencil-plus" aria-hidden="true" />
          Napsat
        </button>
        <label className="tz-hledat">
          <i className="ti ti-search" aria-hidden="true" />
          <input value={hledat} onChange={(e) => setHledat(e.target.value)}
                 placeholder="Hledat v poště…" aria-label="Hledat" />
        </label>
      </div>

      <div className="bm">
        <div className="bm__slozky">
          {SLOZKY.map((s) => (
            <button
              key={s.klic}
              className={`bm__slozka ${s.klic === slozka ? "bm__slozka--on" : ""}`}
              onClick={() => { setSlozka(s.klic); setOtevrena(null); }}
            >
              <i className={`ti ti-${s.ikona}`} aria-hidden="true" />
              <span style={{ flex: 1 }}>{s.nazev}</span>
              {s.klic === "dorucene" && neprectenych > 0 && (
                <span className="bm__pocet">{neprectenych}</span>
              )}
            </button>
          ))}
        </div>

        <div className="bm__seznam">
          {videt.length === 0 ? (
            <p className="kal__prazdno" style={{ padding: 14 }}>
              {hledat ? `Hledání „${hledat}" nic nenašlo.` : "Tady zatím nic není."}
            </p>
          ) : (
            videt.map((z) => {
              const neprectena = !z.precteno_at && z.prijemce === jaId;
              const p = PRIORITY[z.priorita] ?? PRIORITY.bezna;
              return (
                <button
                  key={z.id}
                  className={`bm__radek ${otevrena?.id === z.id ? "bm__radek--on" : ""} ${neprectena ? "bm__radek--nova" : ""}`}
                  onClick={() => otevri(z)}
                >
                  <Avatar
                    jmeno={slozka === "odeslane" ? jmeno(z.prijemce) : (z.odesilatel_jmeno ?? "?")}
                    velikost={32}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="bm__hlava">
                      <span className="bm__kdo">
                        {slozka === "odeslane" ? `pro ${jmeno(z.prijemce)}` : (z.odesilatel_jmeno ?? "neznámý")}
                      </span>
                      <span className="data bm__kdy">{kdyZprava(z.created_at)}</span>
                    </span>
                    <span className="bm__predmet">
                      {z.priorita === "vysoka" && (
                        <i className="ti ti-alert-circle" style={{ color: p.barva, marginRight: 5 }} aria-hidden="true" />
                      )}
                      {z.predmet}
                    </span>
                    <span className="bm__nahled">{nahled(z.telo)}</span>
                  </span>
                  {z.prilohy.length > 0 && (
                    <i className="ti ti-paperclip bm__spona" aria-hidden="true" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="bm__detail">
          {!otevrena ? (
            <p className="kal__prazdno" style={{ padding: 18 }}>
              Vyber zprávu vlevo.
            </p>
          ) : (
            <>
              <div className="bm__d-hlava">
                <Avatar jmeno={otevrena.odesilatel_jmeno ?? "?"} velikost={40} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="bm__d-predmet">{otevrena.predmet}</span>
                  <span className="bm__d-meta">
                    <span>{otevrena.odesilatel_jmeno ?? "neznámý"}</span>
                    <span>pro {jmeno(otevrena.prijemce)}</span>
                    <span>{new Date(otevrena.created_at).toLocaleString("cs-CZ")}</span>
                    {otevrena.priorita !== "bezna" && (
                      <span style={{ color: PRIORITY[otevrena.priorita].barva }}>
                        {PRIORITY[otevrena.priorita].nazev} priorita
                      </span>
                    )}
                  </span>
                </span>
              </div>

              <div className="bm__telo">{otevrena.telo}</div>

              <div className="bm__reakce">
                {REAKCE.map((z) => {
                  const kolik = reakce.filter((r) => r.zprava_id === otevrena.id && r.znak === z).length;
                  const moje = reakce.some((r) => r.zprava_id === otevrena.id && r.user_id === jaId && r.znak === z);
                  return (
                    <button
                      key={z}
                      className={`bm__reakce-btn ${moje ? "bm__reakce-btn--on" : ""}`}
                      onClick={() => prepniReakci(otevrena.id, z)}
                      aria-pressed={moje}
                    >
                      <span aria-hidden="true">{z}</span>
                      {kolik > 0 && <span className="data">{kolik}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="adm-actions">
                <button
                  className="adm-btn adm-btn--primary"
                  onClick={() => setPsani({
                    predmet: predmetOdpovedi(otevrena.predmet),
                    prijemci: [otevrena.odesilatel],
                    telo: "",
                    priorita: "bezna",
                    odpoved_na: otevrena.id,
                  })}
                >
                  <i className="ti ti-arrow-back-up" aria-hidden="true" />
                  Odpovědět
                </button>
                <button
                  className="adm-btn"
                  onClick={() => setPsani({
                    predmet: predmetPreposlani(otevrena.predmet),
                    prijemci: [],
                    // Přeposlaná zpráva nese původní text — jinak by
                    // příjemce dostal prázdno a musel se doptávat.
                    telo: `\n\n— — —\nOd: ${otevrena.odesilatel_jmeno ?? "neznámý"}\n${otevrena.telo}`,
                    priorita: otevrena.priorita,
                    odpoved_na: otevrena.id,
                  })}
                >
                  <i className="ti ti-arrow-forward-up" aria-hidden="true" />
                  Přeposlat
                </button>
                {slozka === "kos" ? (
                  <button className="adm-btn" onClick={() => akce(otevrena.id, "vratit")}>
                    <i className="ti ti-arrow-back-up" aria-hidden="true" />Obnovit
                  </button>
                ) : (
                  <>
                    {slozka === "dorucene" && (
                      <button className="adm-btn" onClick={() => akce(otevrena.id, "archivovat")}>
                        <i className="ti ti-archive" aria-hidden="true" />Archivovat
                      </button>
                    )}
                    <button className="adm-btn" onClick={() => akce(otevrena.id, "smazat")}>
                      <i className="ti ti-trash" aria-hidden="true" />Do koše
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {psani && (
        <>
          <div className="cl-scrim" onClick={() => setPsani(null)} />
          <aside className="cl-panel" role="dialog" aria-label="Nová zpráva">
            <div className="cl-panel__top">
              <span style={{ flex: 1 }}>
                <span className="cl-panel__name">
                  {psani.odpoved_na ? "Odpověď" : "Nová zpráva"}
                </span>
                <span className="data cl-panel__id">betmail</span>
              </span>
              <button onClick={() => setPsani(null)} className="tap cl-close" aria-label="Zavřít">
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>

            <div className="set-pole">
              <span className="set-label">Komu</span>
              <div className="bm__prijemci">
                {lide.map((l) => {
                  const vybrany = psani.prijemci.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      className={`bm__osoba ${vybrany ? "bm__osoba--on" : ""}`}
                      onClick={() => setPsani((s) => s && ({
                        ...s,
                        prijemci: vybrany
                          ? s.prijemci.filter((x) => x !== l.id)
                          : [...s.prijemci, l.id],
                      }))}
                      aria-pressed={vybrany}
                    >
                      <Avatar jmeno={l.name} velikost={22} />
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="set-pole">
              <span className="set-label">Předmět</span>
              <input className="set-input" value={psani.predmet}
                     onChange={(e) => setPsani((s) => s && { ...s, predmet: e.target.value })} />
            </label>

            <label className="set-pole">
              <span className="set-label">Priorita</span>
              <select className="set-input" value={psani.priorita}
                      onChange={(e) => setPsani((s) => s && { ...s, priorita: e.target.value })}>
                <option value="nizka">Nízká</option>
                <option value="bezna">Běžná</option>
                <option value="vysoka">Vysoká</option>
              </select>
            </label>

            <label className="set-pole">
              <span className="set-label">Zpráva</span>
              <textarea className="set-input" rows={9} value={psani.telo}
                        onChange={(e) => setPsani((s) => s && { ...s, telo: e.target.value })}
                        style={{ resize: "vertical", lineHeight: 1.6 }} />
            </label>

            <div className="adm-actions">
              <button className="adm-btn adm-btn--primary" onClick={odesli}>
                <i className="ti ti-send" aria-hidden="true" />
                Odeslat{psani.prijemci.length > 1 ? ` (${psani.prijemci.length})` : ""}
              </button>
              <button className="adm-btn" onClick={() => setPsani(null)}>Zrušit</button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
