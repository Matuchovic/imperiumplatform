"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Relace = {
  id: number;
  jmeno: string;
  jaTo: boolean;
  ipZkracena: string;
  misto: string;
  vpn: boolean;
  cizina: boolean;
  zarizeni: string;
  druh: string;
  trvani: string;
};

export type Udalost = {
  id: number;
  typ: string;
  zavaznost: "info" | "pozor" | "zavazne";
  popis: string;
  misto: string;
  ipZkracena: string;
  kdy: string;
};

const IKONA: Record<string, string> = {
  pocitac: "device-desktop",
  mobil: "device-mobile",
  tablet: "device-tablet",
  nezname: "device-unknown",
};

const BARVA = { info: "#7ef0a8", pozor: "#ffc94a", zavazne: "#ff6b6b" } as const;

export default function BezpecnostPanel({
  zive, udalosti, dnes, neuspechu, zasah,
}: {
  zive: Relace[]; udalosti: Udalost[]; dnes: number; neuspechu: number; zasah: number;
}) {
  const router = useRouter();
  const [zalozka, setZalozka] = useState<"ted" | "udalosti">("ted");
  const [busy, setBusy] = useState<number | null>(null);
  const [odkryte, setOdkryte] = useState<Record<number, string>>({});

  async function volej(telo: Record<string, unknown>) {
    const res = await fetch("/api/bezpecnost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(telo),
    });
    return res.ok ? res.json() : null;
  }

  async function ukonci(id: number) {
    setBusy(id);
    await volej({ akce: "ukoncit", id });
    setBusy(null);
    router.refresh();
  }

  async function odkryj(id: number) {
    setBusy(id);
    // Odkrytí je přístup k osobnímu údaji — server ho zapíše do auditu.
    const d = await volej({ akce: "odkryt", id });
    if (d?.ip) setOdkryte((o) => ({ ...o, [id]: d.ip }));
    setBusy(null);
  }

  return (
    <div className="bz">
      <div className="bz-scan" aria-hidden="true" />

      <p className="bz-nadpis">
        <span className="bz-blip" />
        <span>Bezpečnost</span>
      </p>
      <p className="bz-lead">
        Kdo je v systému, odkud a jak dlouho. Údaje se uchovávají 90 dní, pak se mažou.
      </p>

      <div className="bz-kpi-mriz">
        <div className="bz-kpi">
          <p className="data bz-kpi__k">PRÁVĚ V SYSTÉMU</p>
          <p className="data bz-kpi__n" style={{ color: "#7ef0a8" }}>{zive.length}</p>
        </div>
        <div className="bz-kpi">
          <p className="data bz-kpi__k">PŘIHLÁŠENÍ DNES</p>
          <p className="data bz-kpi__n" style={{ color: "#dff5e8" }}>{dnes}</p>
        </div>
        <div className={`bz-kpi ${neuspechu > 0 ? "bz-kpi--warn" : ""}`}>
          <p className="data bz-kpi__k">NEÚSPĚŠNÉ POKUSY</p>
          <p className="data bz-kpi__n" style={{ color: neuspechu > 0 ? "#ffc94a" : "#dff5e8" }}>{neuspechu}</p>
        </div>
        <div className={`bz-kpi ${zasah > 0 ? "bz-kpi--bad" : ""}`}>
          <p className="data bz-kpi__k">VYŽADUJE ZÁSAH</p>
          <p className="data bz-kpi__n" style={{ color: zasah > 0 ? "#ff8a8a" : "#dff5e8" }}>{zasah}</p>
        </div>
      </div>

      <div className="bz-taby" role="tablist">
        <button className="bz-tab" role="tab" aria-selected={zalozka === "ted"}
                onClick={() => setZalozka("ted")}>Právě teď</button>
        <button className="bz-tab" role="tab" aria-selected={zalozka === "udalosti"}
                onClick={() => setZalozka("udalosti")}>Události</button>
      </div>

      {zalozka === "ted" && (
        <div className="bz-seznam">
          {zive.length === 0 ? (
            <p className="bz-prazdno">Nikdo není přihlášen.</p>
          ) : zive.map((r) => {
            const stav = r.vpn || r.cizina ? "pozor" : "info";
            return (
              <div key={r.id} className={`bz-radek bz-radek--${stav}`}
                   style={{ ["--pruh" as string]: BARVA[stav] }}>
                <span className="bz-kdo">
                  <span className="bz-pic" style={{ background: `${BARVA[stav]}22`, color: BARVA[stav] }}>
                    <i className={`ti ti-${IKONA[r.druh] ?? "device-unknown"}`} aria-hidden="true" />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="bz-jmeno">
                      {r.jmeno}
                      {r.jaTo && <span className="bz-ja"> to jsi ty</span>}
                    </span>
                    <span className="bz-meta">
                      <span><i className="ti ti-device-desktop" aria-hidden="true" />{r.zarizeni}</span>
                      <span style={r.cizina ? { color: "#ffc94a" } : undefined}>
                        <i className="ti ti-map-pin" aria-hidden="true" />{r.misto}
                      </span>
                      {r.vpn && (
                        <span style={{ color: "#ffc94a" }}>
                          <i className="ti ti-shield-half" aria-hidden="true" />VPN
                        </span>
                      )}
                      <button className="bz-ip" onClick={() => odkryj(r.id)} disabled={busy === r.id}
                              title="Zobrazit celou adresu — zapíše se do auditu">
                        <i className="ti ti-network" aria-hidden="true" />
                        {odkryte[r.id] ?? r.ipZkracena}
                      </button>
                      <span><i className="ti ti-clock" aria-hidden="true" />{r.trvani}</span>
                    </span>
                  </span>
                </span>

                <span className="bz-akce">
                  {r.jaTo ? (
                    <span className="data bz-tag" style={{ background: "rgba(126,240,168,.12)", color: "#7ef0a8" }}>
                      <span className="bz-blip bz-blip--maly" />aktivní
                    </span>
                  ) : (
                    <button className="bz-btn" onClick={() => ukonci(r.id)} disabled={busy === r.id}>
                      {busy === r.id ? "…" : "Odhlásit"}
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {zalozka === "udalosti" && (
        <div className="bz-seznam">
          {udalosti.length === 0 ? (
            <p className="bz-prazdno">Zatím žádné události.</p>
          ) : udalosti.map((u) => (
            <div key={u.id} className={`bz-radek bz-radek--${u.zavaznost === "zavazne" ? "zle" : u.zavaznost}`}
                 style={{ ["--pruh" as string]: BARVA[u.zavaznost] }}>
              <span className="bz-kdo">
                <span className="bz-pic" style={{ background: `${BARVA[u.zavaznost]}22`, color: BARVA[u.zavaznost] }}>
                  <i className={`ti ti-${u.zavaznost === "info" ? "info-circle" : "alert-triangle"}`} aria-hidden="true" />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="bz-jmeno">{u.popis || u.typ}</span>
                  <span className="bz-meta">
                    <span><i className="ti ti-map-pin" aria-hidden="true" />{u.misto}</span>
                    <span><i className="ti ti-network" aria-hidden="true" />{u.ipZkracena}</span>
                    <span><i className="ti ti-clock" aria-hidden="true" />{u.kdy}</span>
                  </span>
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="data bz-pata">
        IP ADRESY ZKRÁCENÉ · ZOBRAZENÍ CELÉ SE ZAPÍŠE DO AUDITU · UCHOVÁNÍ 90 DNÍ
      </p>
    </div>
  );
}
