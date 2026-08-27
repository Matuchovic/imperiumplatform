"use client";

import QrPlatba from "./QrPlatba";
import { soucty, type Polozka } from "@/lib/faktury/polozky";
import { formatujIban, naIban } from "@/lib/faktury/iban";
import { kc } from "@/lib/faktury/stav";

/**
 * Doklad k tisku.
 *
 * Vlastní styly pro tisk — na papíře nemá co dělat tmavé pozadí
 * ani neonové efekty.
 */

export type Faktura = {
  id: number; cislo: string; odberatel: string;
  odberatel_ico: string | null; odberatel_dic: string | null;
  odberatel_adresa: string | null; odberatel_email: string | null;
  vystaveno: string; splatnost: string | null; duzp: string | null;
  polozky: Polozka[]; bez_dph: number; dph: number; castka: number;
  vs: string | null; zpusob: string; stav: string; poznamka: string | null;
  // Potřebné pro výpočty nad seznamem — bez toho se typ rozejde
  // s tím, co čeká lib/faktury/stav.
  zaplaceno_at: string | null;
};

export type Udaje = {
  nazev: string; ico: string | null; dic: string | null;
  adresa: string | null; ucet: string | null; platce_dph: boolean;
};

const den = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("cs-CZ") : "—");

export default function Doklad({ f, udaje }: { f: Faktura; udaje: Udaje | null }) {
  const s = soucty(f.polozky, udaje?.platce_dph ?? false);
  const iban = udaje?.ucet ? naIban(udaje.ucet) : null;

  return (
    <div className="dk">
      <div className="dk__hlava">
        <div>
          <p className="dk__nadpis">
            {udaje?.platce_dph ? "Faktura — daňový doklad" : "Faktura"}
          </p>
          <p className="dk__cislo">{f.cislo}</p>
        </div>
        <div className="dk__znacka">
          <span style={{ color: "#7ef0a8" }}>BET</span>
          <span>IMPERIUM</span>
        </div>
      </div>

      <div className="dk__strany">
        <div>
          <p className="dk__popisek">Dodavatel</p>
          <p className="dk__nazev">{udaje?.nazev ?? "BETIMPERIUM s.r.o."}</p>
          {udaje?.adresa && <p className="dk__radek">{udaje.adresa}</p>}
          {udaje?.ico && <p className="dk__radek">IČO {udaje.ico}</p>}
          {udaje?.dic && <p className="dk__radek">DIČ {udaje.dic}</p>}
          {!udaje?.platce_dph && <p className="dk__radek">Neplátce DPH</p>}
        </div>
        <div>
          <p className="dk__popisek">Odběratel</p>
          <p className="dk__nazev">{f.odberatel}</p>
          {f.odberatel_adresa && <p className="dk__radek">{f.odberatel_adresa}</p>}
          {f.odberatel_ico && <p className="dk__radek">IČO {f.odberatel_ico}</p>}
          {f.odberatel_dic && <p className="dk__radek">DIČ {f.odberatel_dic}</p>}
        </div>
      </div>

      <div className="dk__datumy">
        <span><span className="dk__popisek">Vystaveno</span>{den(f.vystaveno)}</span>
        <span><span className="dk__popisek">Splatnost</span>{den(f.splatnost)}</span>
        {udaje?.platce_dph && (
          <span><span className="dk__popisek">DUZP</span>{den(f.duzp)}</span>
        )}
        <span><span className="dk__popisek">Variabilní symbol</span>{f.vs ?? "—"}</span>
      </div>

      <table className="dk__tab">
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Položka</th>
            <th>Množství</th>
            <th>Cena</th>
            {udaje?.platce_dph && <th>DPH</th>}
            <th>Celkem</th>
          </tr>
        </thead>
        <tbody>
          {f.polozky.map((p, i) => (
            <tr key={i}>
              <td style={{ textAlign: "left" }}>{p.nazev}</td>
              <td>{p.mnozstvi} {p.jednotka}</td>
              <td>{kc(p.cena)}</td>
              {udaje?.platce_dph && <td>{p.dph} %</td>}
              <td>{kc(p.mnozstvi * p.cena)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="dk__soucty">
        {udaje?.platce_dph ? (
          <>
            <span><span>Základ</span>{kc(s.bezDph)}</span>
            {s.podleSazeb.map((r) => (
              <span key={r.sazba}>
                <span>DPH {r.sazba} %</span>{kc(r.dan)}
              </span>
            ))}
            <span className="dk__celkem"><span>Celkem k úhradě</span>{kc(s.celkem)}</span>
          </>
        ) : (
          <span className="dk__celkem"><span>Celkem k úhradě</span>{kc(s.celkem)}</span>
        )}
      </div>

      {udaje?.ucet && f.stav !== "koncept" && (
        <div className="dk__platba">
          <div>
            <p className="dk__popisek">Platba převodem</p>
            <p className="dk__radek">Účet {udaje.ucet}</p>
            {iban && <p className="dk__radek">IBAN {formatujIban(iban)}</p>}
            <p className="dk__radek">Variabilní symbol {f.vs}</p>
          </div>
          <QrPlatba
            platba={{
              ucet: udaje.ucet,
              castka: s.celkem,
              vs: f.vs ?? undefined,
              zprava: `Faktura ${f.cislo}`,
              splatnost: f.splatnost,
            }}
          />
        </div>
      )}

      {f.poznamka && <p className="dk__poznamka">{f.poznamka}</p>}

      <p className="dk__pata">
        {udaje?.platce_dph
          ? "Doklad je vystaven v souladu se zákonem o DPH."
          : "Dodavatel není plátcem DPH."}
      </p>
    </div>
  );
}
