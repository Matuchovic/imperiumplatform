import type { Band } from "@/lib/engine/bands";
import type { Candidate } from "@/lib/engine/types";

const TONE = {
  good: "rgba(126,240,168,.26)",
  warn: "rgba(255,201,74,.22)",
  bad: "rgba(255,107,107,.2)",
} as const;

export default function BandCard({ band, items }: { band: Band; items: Candidate[] }) {
  return (
    <section className="bd" style={{ borderColor: TONE[band.tone] }}>
      <div className="bd__head">
        <span className="bd__name">{band.label}</span>
        <span className="data bd__range">
          {band.min.toFixed(2)} – {band.max > 90 ? "∞" : band.max.toFixed(2)}
        </span>
      </div>

      <p className="data bd__count">
        {items.length}
        <span> {items.length === 1 ? "nález dnes" : "nálezů dnes"}</span>
      </p>

      <Fact k="Očekávaná úspěšnost" v={`${band.hitRate[0]}–${band.hitRate[1]} %`} />
      <Fact k="Sázka z bankrollu" v={`${band.stakePct[0]}–${band.stakePct[1]} %`} />
      <Fact
        k="Nejdelší série proher"
        v={`běžně ${band.losingRun[0]}, až ${band.losingRun[1]}`}
        tone={band.tone}
      />
      <Fact k="Na prokázání výhody" v={`${band.proofN.toLocaleString("cs-CZ")} tiketů`} />

      {items.length > 0 ? (
        <div className="bd__list">
          {items.map((c) => (
            <div key={c.id} className="bd__tip">
              <span className="data bd__odds">{c.offeredOdds.toFixed(2)}</span>
              <span className="bd__event">
                {c.event}
                <span> · {c.selection}</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="bd__empty">
          Dnes tu hodnota není. Pásmo zůstane prázdné — nedoplňuje se sázkou
          bez výhody, jen aby něco odešlo.
        </p>
      )}

      <p className="bd__mode">
        {band.autoApprove ? "Odchází automaticky" : "Čeká na schválení"}
      </p>
    </section>
  );
}

function Fact({ k, v, tone }: { k: string; v: string; tone?: Band["tone"] }) {
  const color = tone === "bad" ? "#ff6b6b" : tone === "warn" ? "#ffc94a" : "#cfe6d8";
  return (
    <div className="bd__fact">
      <span>{k}</span>
      <span className="data" style={{ color }}>{v}</span>
    </div>
  );
}
