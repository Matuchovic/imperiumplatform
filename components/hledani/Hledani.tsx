"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NAV, jeTym, type Role } from "@/components/admin/nav";

/**
 * Hledání v horní liště.
 *
 * Hledá ve dvou vrstvách. Sekce se filtrují okamžitě z paměti —
 * na přeskočení do Nastavení nemá nikdo čekat na server. Data
 * se dotahují s prodlevou, aby každé písmeno neznamenalo dotaz.
 */

type Nalez = { id: string; nazev: string; popis?: string; href: string };
type Skupina = { nazev: string; ikona: string; nalezy: Nalez[] };

const PRODLEVA_MS = 220;

export default function Hledani({ role }: { role: Role }) {
  const router = useRouter();
  const [dotaz, setDotaz] = useState("");
  const [otevreno, setOtevreno] = useState(false);
  const [skupiny, setSkupiny] = useState<Skupina[]>([]);
  const [hleda, setHleda] = useState(false);
  const [vybrany, setVybrany] = useState(0);
  const obal = useRef<HTMLDivElement>(null);
  const pole = useRef<HTMLInputElement>(null);

  /** Sekce z navigace — okamžitě, bez serveru. */
  const sekce: Nalez[] = (() => {
    const t = dotaz.trim().toLowerCase();
    if (t.length < 1) return [];
    return NAV.flatMap((g) => g.items)
      .filter((i) => i.roles.includes(role) && i.label.toLowerCase().includes(t))
      .slice(0, 4)
      .map((i) => ({ id: `s-${i.href}`, nazev: i.label, href: i.href, popis: "sekce" }));
  })();

  const hledej = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSkupiny([]); return; }
    setHleda(true);
    try {
      const r = await fetch(`/api/hledat?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (r.ok) setSkupiny(d.skupiny ?? []);
    } catch { /* další úhoz to zkusí znovu */ }
    setHleda(false);
  }, []);

  // Prodleva mezi psaním a dotazem. Bez ní by každé písmeno
  // znamenalo volání serveru.
  useEffect(() => {
    const t = setTimeout(() => hledej(dotaz), PRODLEVA_MS);
    return () => clearTimeout(t);
  }, [dotaz, hledej]);

  // Zavření klepnutím vedle.
  useEffect(() => {
    const klik = (e: MouseEvent) => {
      if (!obal.current?.contains(e.target as Node)) setOtevreno(false);
    };
    document.addEventListener("mousedown", klik);
    return () => document.removeEventListener("mousedown", klik);
  }, []);

  // Lomítko otevře hledání odkudkoli. ⌘K patří asistentovi.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const cil = e.target as HTMLElement;
      const píše = ["INPUT", "TEXTAREA", "SELECT"].includes(cil.tagName) || cil.isContentEditable;
      if (e.key === "/" && !píše) {
        e.preventDefault();
        pole.current?.focus();
        setOtevreno(true);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const vsechny: Nalez[] = [...sekce, ...skupiny.flatMap((s) => s.nalezy)];

  function klavesa(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOtevreno(false); pole.current?.blur(); return; }
    if (!vsechny.length) return;

    if (e.key === "ArrowDown") { e.preventDefault(); setVybrany((v) => (v + 1) % vsechny.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setVybrany((v) => (v - 1 + vsechny.length) % vsechny.length); }
    else if (e.key === "Enter") { e.preventDefault(); jdi(vsechny[vybrany]); }
  }

  function jdi(n: Nalez | undefined) {
    if (!n) return;
    setOtevreno(false);
    setDotaz("");
    router.push(n.href);
  }

  const prazdno = dotaz.trim().length >= 2 && !hleda && vsechny.length === 0;

  return (
    <div className="hl" ref={obal}>
      <label className={`hl-pole ${otevreno ? "hl-pole--on" : ""}`}>
        <i className="ti ti-search" aria-hidden="true" />
        <input
          ref={pole}
          type="search"
          value={dotaz}
          onChange={(e) => { setDotaz(e.target.value); setVybrany(0); setOtevreno(true); }}
          onFocus={() => setOtevreno(true)}
          onKeyDown={klavesa}
          placeholder="Hledat…"
          aria-label="Hledat v systému"
          aria-expanded={otevreno}
        />
        {dotaz ? (
          <button className="hl-zrus tap" onClick={() => { setDotaz(""); pole.current?.focus(); }}
                  aria-label="Vymazat">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        ) : (
          <span className="data hl-zkratka" aria-hidden="true">/</span>
        )}
      </label>

      {otevreno && dotaz.trim().length > 0 && (
        <div className="hl-vysledky" role="listbox">
          {sekce.length > 0 && (
            <Skupinka nazev="Sekce" ikona="layout-grid">
              {sekce.map((n, i) => (
                <Radek key={n.id} n={n} vybrany={vybrany === i} onKlik={() => jdi(n)}
                       onNajeti={() => setVybrany(i)} />
              ))}
            </Skupinka>
          )}

          {skupiny.map((s) => {
            const posun = sekce.length + skupiny
              .slice(0, skupiny.indexOf(s))
              .reduce((a, x) => a + x.nalezy.length, 0);
            return (
              <Skupinka key={s.nazev} nazev={s.nazev} ikona={s.ikona}>
                {s.nalezy.map((n, i) => (
                  <Radek key={n.id} n={n} vybrany={vybrany === posun + i}
                         onKlik={() => jdi(n)} onNajeti={() => setVybrany(posun + i)} />
                ))}
              </Skupinka>
            );
          })}

          {hleda && vsechny.length === 0 && <p className="hl-stav">Hledám…</p>}
          {prazdno && <p className="hl-stav">Nic nenalezeno.</p>}

          {dotaz.trim().length === 1 && (
            <p className="hl-stav">Napiš aspoň dvě písmena.</p>
          )}

          <p className="hl-napoveda">
            <span><kbd>↑</kbd><kbd>↓</kbd> pohyb</span>
            <span><kbd>↵</kbd> otevřít</span>
            <span><kbd>esc</kbd> zavřít</span>
          </p>
        </div>
      )}
    </div>
  );
}

function Skupinka({
  nazev, ikona, children,
}: { nazev: string; ikona: string; children: React.ReactNode }) {
  return (
    <div className="hl-skupina">
      <p className="data hl-skupina__nazev">
        <i className={`ti ti-${ikona}`} aria-hidden="true" />
        {nazev}
      </p>
      {children}
    </div>
  );
}

function Radek({
  n, vybrany, onKlik, onNajeti,
}: { n: Nalez; vybrany: boolean; onKlik: () => void; onNajeti: () => void }) {
  return (
    <button
      className={`hl-radek ${vybrany ? "hl-radek--on" : ""}`}
      onClick={onKlik}
      onMouseEnter={onNajeti}
      role="option"
      aria-selected={vybrany}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="hl-nazev">{n.nazev}</span>
        {n.popis && <span className="hl-popis">{n.popis}</span>}
      </span>
      <i className="ti ti-arrow-right hl-sipka" aria-hidden="true" />
    </button>
  );
}
