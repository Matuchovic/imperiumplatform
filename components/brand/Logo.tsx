/**
 * Značka.
 *
 * Přívlastek MANAGEMENT sedí u horní hrany verzálek, ne na účaří —
 * na účaří působil jako dodatek, nahoře jako označení kategorie.
 * Světlo po něm přejede jednou za sedm vteřin.
 *
 * Znak vlevo je samostatný soubor bez textu. Plná ikona obsahuje
 * nápis, který se při zmenšení na tři centimetry rozmaže v kaši.
 */
export default function Logo({
  size = 24,
  suffix = true,
  znak = false,
}: {
  size?: number;
  /** Přívlastek jde vypnout tam, kde by rušil. */
  suffix?: boolean;
  /** Znak vlevo od názvu. */
  znak?: boolean;
}) {
  const jadro = (
    <span className="brand" style={{ fontSize: size }}>
      <span className="brand__word">
        <span className="text-signal">BET</span>
        <span className="text-chalk">IMPERIUM</span>
      </span>
      {suffix && (
        <span className="brand__suffix" style={{ fontSize: Math.max(7, size * 0.42) }}>
          MANAGEMENT
        </span>
      )}
    </span>
  );

  if (!znak) return jadro;

  return (
    <span className="brand-obal">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/znak-192.png"
        alt=""
        className="brand-znak"
        style={{ width: size * 2.1, height: size * 2.1 }}
      />
      {jadro}
    </span>
  );
}
