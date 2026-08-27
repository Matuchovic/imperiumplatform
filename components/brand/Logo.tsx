/**
 * Značka.
 *
 * Volitelný znak vlevo — je to ta samá ikona, kterou má aplikace
 * na ploše, takže se obojí spojí. V liště se vypíná, tam by
 * dvakrát tatáž ikona byla šum.
 *
 * Přívlastek MANAGEMENT je pod názvem, ne vedle. Vedle působil
 * jako druhé slovo v názvu, pod ním jako podtitul — což je pravda.
 */
export default function Logo({
  size = 24,
  suffix = true,
  znak = false,
}: {
  size?: number;
  /** Přívlastek jde vypnout tam, kde by rušil. */
  suffix?: boolean;
  /** Ikona aplikace vlevo od názvu. */
  znak?: boolean;
}) {
  const jadro = (
    <span className="brand" style={{ fontSize: size }}>
      <span className="brand__word">
        <span className="text-signal">BET</span>
        <span className="text-chalk">IMPERIUM</span>
      </span>
      {suffix && (
        <span className="brand__radka">
          <span className="brand__suffix" style={{ fontSize: Math.max(7.5, size * 0.42) }}>
            MANAGEMENT
          </span>
          {/* Linka odděluje značku od navigace — bez ní splývá
              s první položkou. */}
          <span className="brand__cara" aria-hidden="true" />
        </span>
      )}
    </span>
  );

  if (!znak) return jadro;

  return (
    <span className="brand-obal">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt=""
        className="brand-znak"
        style={{ width: size * 1.9, height: size * 1.9 }}
      />
      {jadro}
    </span>
  );
}
