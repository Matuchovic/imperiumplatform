"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import DetailVozidla from "./DetailVozidla";
import FormularVozidla from "./FormularVozidla";
import {
  STAVY, PALIVA, naleha, zbyva, nejhorsiLhuta, BARVA_LHUTY,
  type Stav,
} from "@/lib/vozidla/lhuty";

/**
 * Vozový park.
 *
 * Dvě záložky — vozidla a tankovací karty. Cizí auta se řidiči
 * vůbec nenačtou; filtr je v dotazu na serveru, ne tady.
 */

export type Vozidlo = {
  id: number;
  spz: string;
  znacka: string;
  model: string | null;
  rok: number | null;
  palivo: string | null;
  vin: string | null;
  barva: string | null;
  tachometr: number;
  stav: string;
  ridic: string | null;
  ridic_jmeno: string | null;
  stk_do: string | null;
  pojisteni_do: string | null;
  znamka_do: string | null;
  servis_do: string | null;
  poznamka: string | null;
};

export type Karta = {
  id: number;
  cislo: string;
  vydavatel: string | null;
  platnost_do: string | null;
  limit_mesic: number | null;
  vozidlo_id: number | null;
  drzitel: string | null;
  drzitel_jmeno: string | null;
  aktivni: boolean;
  poznamka: string | null;
};

export type Clovek = { id: string; name: string };

export default function VozovyPark({ jaId }: { jaId: string }) {
  const [zalozka, setZalozka] = useState<"vozidla" | "karty">("vozidla");
  const [vozidla, setVozidla] = useState<Vozidlo[]>([]);
  const [karty, setKarty] = useState<Karta[]>([]);
  const [lide, setLide] = useState<Clovek[]>([]);
  const [smi, setSmi] = useState(false);
  const [otevrene, setOtevrene] = useState<Vozidlo | null>(null);
  const [formular, setFormular] = useState<null | "vozidlo" | "karta">(null);
  const [hledat, setHledat] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    try {
      const r = await fetch("/api/vozidla", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setChyba(d?.error ?? "Načtení selhalo."); return; }
      setVozidla(d.vozidla ?? []);
      setKarty(d.karty ?? []);
      setLide(d.lide ?? []);
      setSmi(Boolean(d.smiSpravovat));
      setChyba(null);
    } catch {
      setChyba("Nepodařilo se spojit se serverem.");
    }
  }, []);

  useEffect(() => { nacti(); }, [nacti]);

  const souhrn = useMemo(() => ({
    aktivni: vozidla.filter((v) => v.stav === "aktivni").length,
    servis: vozidla.filter((v) => v.stav === "servis").length,
    // Propadlé i to, co vyprší do měsíce — obojí vyžaduje zásah.
    lhuty: vozidla.filter((v) => ["propadle", "brzy", "blizi"].includes(nejhorsiLhuta(v))).length,
  }), [vozidla]);

  const videt = useMemo(() => {
    const f = hledat.trim().toLowerCase();
    const seznam = f
      ? vozidla.filter((v) =>
          [v.spz, v.znacka, v.model, v.ridic_jmeno].some((x) => x?.toLowerCase().includes(f)))
      : vozidla;
    // Nejnaléhavější nahoru — jinak se propadlá STK ztratí v seznamu.
    const poradi = ["propadle", "brzy", "blizi", "ok", "nezadano"];
    return [...seznam].sort(
      (a, b) => poradi.indexOf(nejhorsiLhuta(a)) - poradi.indexOf(nejhorsiLhuta(b))
    );
  }, [vozidla, hledat]);

  async function smaz(id: number, co: "vozidlo" | "karta", nazev: string) {
    if (!confirm(`Smazat ${co === "karta" ? "kartu" : "vozidlo"} „${nazev}"? U vozidla zmizí i kniha jízd a servis.`)) return;
    const r = await fetch(`/api/vozidla?id=${id}&co=${co}`, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setChyba(d?.error ?? "Smazání selhalo.");
    }
    setOtevrene(null);
    nacti();
  }

  return (
    <>
      {chyba && (
        <div className="adm-alert adm-alert--bad">
          <span className="adm-alert__text">
            <span className="adm-alert__title">{chyba}</span>{" "}
            <span className="adm-alert__detail">Spustil jsi supabase/vozidla.sql?</span>
          </span>
        </div>
      )}

      <div className="adm-cards">
        <div className="tz-kpi">
          <p className="tz-kpi__k">VOZIDEL</p>
          <p className="tz-kpi__n" style={{ color: "#dff5e8" }}>{vozidla.length}</p>
        </div>
        <div className="tz-kpi">
          <p className="tz-kpi__k">AKTIVNÍCH</p>
          <p className="tz-kpi__n" style={{ color: "#7ef0a8" }}>{souhrn.aktivni}</p>
        </div>
        <div className={`tz-kpi ${souhrn.servis > 0 ? "tz-kpi--warn" : ""}`}>
          <p className="tz-kpi__k">V SERVISU</p>
          <p className="tz-kpi__n" style={{ color: souhrn.servis ? "#ffc94a" : "#dff5e8" }}>
            {souhrn.servis}
          </p>
        </div>
        <div className={`tz-kpi ${souhrn.lhuty > 0 ? "tz-kpi--warn" : ""}`}>
          <p className="tz-kpi__k">LHŮTY K ŘEŠENÍ</p>
          <p className="tz-kpi__n" style={{ color: souhrn.lhuty ? "#ffc94a" : "#dff5e8" }}>
            {souhrn.lhuty}
          </p>
        </div>
      </div>

      <div className="vz-zalozky">
        <button
          className={`vz-zalozka ${zalozka === "vozidla" ? "vz-zalozka--on" : ""}`}
          onClick={() => setZalozka("vozidla")}
        >
          <i className="ti ti-car" aria-hidden="true" />
          Vozidla
          <span className="vz-pocet">{vozidla.length}</span>
        </button>
        <button
          className={`vz-zalozka ${zalozka === "karty" ? "vz-zalozka--on" : ""}`}
          onClick={() => setZalozka("karty")}
        >
          <i className="ti ti-credit-card" aria-hidden="true" />
          Tankovací karty
          <span className="vz-pocet">{karty.length}</span>
        </button>
      </div>

      <div className="adm-actions">
        {smi && (
          <button
            className="adm-btn adm-btn--primary"
            onClick={() => setFormular(zalozka === "vozidla" ? "vozidlo" : "karta")}
          >
            <i className="ti ti-plus" aria-hidden="true" />
            {zalozka === "vozidla" ? "Přidat vozidlo" : "Přidat kartu"}
          </button>
        )}
        {zalozka === "vozidla" && (
          <label className="tz-hledat">
            <i className="ti ti-search" aria-hidden="true" />
            <input value={hledat} onChange={(e) => setHledat(e.target.value)}
                   placeholder="SPZ, značka, řidič…" aria-label="Hledat vozidlo" />
          </label>
        )}
      </div>

      {zalozka === "vozidla" ? (
        videt.length === 0 ? (
          <div className="tz-skupina">
            <p className="adm-panel__lead" style={{ margin: 0 }}>
              {vozidla.length === 0
                ? smi ? "Zatím žádná vozidla. Přidej první tlačítkem nahoře."
                      : "Nemáte přiřazené žádné vozidlo. Přiřazuje ho vedení."
                : `Hledání „${hledat}" nic nenašlo.`}
            </p>
          </div>
        ) : (
          <div className="vz-mrizka">
            {videt.map((v) => {
              const lhuta = nejhorsiLhuta(v);
              const s = STAVY[v.stav as Stav] ?? STAVY.aktivni;
              return (
                <button key={v.id} className="vz-karta" onClick={() => setOtevrene(v)}>
                  {/* Levý pruh nese nejnaléhavější lhůtu. */}
                  <span className="vz-pruh" style={{ background: BARVA_LHUTY[lhuta] }} />

                  <span className="vz-hlava">
                    <span className="data vz-spz">{v.spz}</span>
                    <span className="vz-stav" style={{ color: s.barva }}>{s.nazev}</span>
                  </span>

                  <span className="vz-nazev">
                    {v.znacka} {v.model ?? ""}
                    {v.rok && <span className="vz-rok"> · {v.rok}</span>}
                  </span>

                  <span className="vz-meta">
                    <span>{v.tachometr.toLocaleString("cs-CZ")} km</span>
                    {v.palivo && <span>{PALIVA[v.palivo]}</span>}
                  </span>

                  {v.ridic_jmeno ? (
                    <span className="vz-ridic">
                      <Avatar jmeno={v.ridic_jmeno} velikost={22} />
                      {v.ridic_jmeno}
                    </span>
                  ) : (
                    <span className="vz-ridic vz-ridic--bez">
                      <i className="ti ti-user-off" aria-hidden="true" />
                      Bez řidiče
                    </span>
                  )}

                  {lhuta !== "ok" && lhuta !== "nezadano" && (
                    <span className="vz-lhuta" style={{ color: BARVA_LHUTY[lhuta] }}>
                      <i className="ti ti-alert-circle" aria-hidden="true" />
                      {nejblizsiPopis(v)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )
      ) : (
        <div className="tz-skupina">
          {karty.length === 0 ? (
            <p className="adm-panel__lead" style={{ margin: 0 }}>
              {smi ? "Zatím žádné karty." : "Nemáte přiřazenou žádnou kartu."}
            </p>
          ) : (
            karty.map((k) => {
              const n = naleha(k.platnost_do);
              const auto = vozidla.find((v) => v.id === k.vozidlo_id);
              return (
                <div key={k.id} className="vz-karta-radek">
                  <span className="vz-k-ikona" style={{ opacity: k.aktivni ? 1 : 0.4 }}>
                    <i className="ti ti-credit-card" aria-hidden="true" />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="data vz-k-cislo">{k.cislo}</span>
                    <span className="vz-meta">
                      {k.vydavatel && <span>{k.vydavatel}</span>}
                      {auto && <span>{auto.spz}</span>}
                      {k.drzitel_jmeno && <span>{k.drzitel_jmeno}</span>}
                      {k.limit_mesic && <span>limit {k.limit_mesic.toLocaleString("cs-CZ")} Kč</span>}
                      {k.platnost_do && (
                        <span style={{ color: BARVA_LHUTY[n] }}>platí {zbyva(k.platnost_do)}</span>
                      )}
                      {!k.aktivni && <span style={{ color: "#ff8a8a" }}>neaktivní</span>}
                    </span>
                  </span>
                  {smi && (
                    <button className="tz-btn tz-btn--zla" onClick={() => smaz(k.id, "karta", k.cislo)}
                            aria-label="Smazat kartu">
                      <i className="ti ti-trash" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {otevrene && (
        <DetailVozidla
          vozidlo={otevrene}
          karty={karty.filter((k) => k.vozidlo_id === otevrene.id)}
          lide={lide}
          smiSpravovat={smi}
          jaId={jaId}
          onZavri={() => setOtevrene(null)}
          onZmena={() => { nacti(); setOtevrene(null); }}
          onSmazat={() => smaz(otevrene.id, "vozidlo", otevrene.spz)}
        />
      )}

      {formular && (
        <FormularVozidla
          co={formular}
          lide={lide}
          vozidla={vozidla}
          onZavri={() => setFormular(null)}
          onUlozeno={() => { setFormular(null); nacti(); }}
        />
      )}
    </>
  );
}

/** Která lhůta je nejblíž — text na kartu. */
function nejblizsiPopis(v: Vozidlo): string {
  const lhuty: [string, string | null][] = [
    ["STK", v.stk_do], ["Pojištění", v.pojisteni_do],
    ["Známka", v.znamka_do], ["Servis", v.servis_do],
  ];
  const poradi = ["propadle", "brzy", "blizi", "ok", "nezadano"];

  const seřazené = lhuty
    .filter(([, d]) => d)
    .sort((a, b) => poradi.indexOf(naleha(a[1])) - poradi.indexOf(naleha(b[1])));

  const [nazev, datum] = seřazené[0] ?? [];
  return nazev && datum ? `${nazev} ${zbyva(datum)}` : "";
}
