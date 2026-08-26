/**
 * Značka.
 *
 * Přívlastek MANAGEMENT sedí u horní hrany verzálek, ne na účaří —
 * na účaří působil jako dodatek, nahoře jako označení kategorie.
 * Světlo po něm přejede jednou za sedm vteřin; zbytek času je klidný,
 * protože v postranním panelu je na očích celý den.
 */
export default function Logo({
  size = 24,
  suffix = true,
}: {
  size?: number;
  /** Přívlastek jde vypnout tam, kde by rušil. */
  suffix?: boolean;
}) {
  return (
    <span className="brand" style={{ fontSize: size }}>
      <span className="brand__word">
        <span className="text-signal">BET</span>
        <span className="text-chalk">IMPERIUM</span>
      </span>
      {suffix && (
        <span className="brand__suffix" style={{ fontSize: Math.max(7, size * 0.44) }}>
          MANAGEMENT
        </span>
      )}
    </span>
  );
}
