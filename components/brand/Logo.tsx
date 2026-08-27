/**
 * Značka.
 *
 * Přívlastek MANAGEMENT PLATFORM je pod názvem. Vedle něj se do
 * panelu širokého 232 px nevejde a ořezané slovo vypadá jako chyba.
 * Světlo po něm přejede jednou za sedm vteřin.
 *
 * Znak vlevo je samostatný soubor bez textu. Plná ikona obsahuje
 * nápis, který se při zmenšení na tři centimetry rozmaže v kaši.
 */
export default function Logo({
  size = 24,
  suffix = true,
  znak = false,
  stred = false,
}: {
  size?: number;
  /** Přívlastek jde vypnout tam, kde by rušil. */
  suffix?: boolean;
  /** Znak vlevo od názvu. */
  znak?: boolean;
  /** Na střed. V panelu vlevo, na přihlášení vystředěné. */
  stred?: boolean;
}) {
  const jadro = (
    <span className={`brand ${stred ? "brand--stred" : ""}`} style={{ fontSize: size }}>
      <span className="brand__word">
        <span className="text-signal">BET</span>
        <span className="text-chalk">IMPERIUM</span>
      </span>
      {suffix && (
        <span className="brand__suffix" style={{ fontSize: Math.max(7, size * 0.44) }}>
          MANAGEMENT PLATFORM
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
        style={{ width: size * 2.2, height: size * 2.2 }}
      />
      {jadro}
    </span>
  );
}
