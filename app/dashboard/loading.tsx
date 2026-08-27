/**
 * Kostra sekce.
 *
 * Ukáže se okamžitě při přepnutí, zatímco server dopočítává data.
 * Bez ní obrazovka zamrzne na staré sekci a přepnutí působí,
 * jako by kliknutí neprošlo.
 */
export default function Nacitani() {
  return (
    <div className="sk" aria-busy="true" aria-label="Načítám">
      <span className="sk-radek" style={{ width: "36%", height: 26 }} />
      <span className="sk-radek" style={{ width: "62%", height: 14, marginTop: 12 }} />

      <div className="sk-karty">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="sk-karta" />
        ))}
      </div>

      <div className="sk-panel">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="sk-radek" style={{ width: `${88 - i * 9}%`, height: 13 }} />
        ))}
      </div>
    </div>
  );
}
