import { barvaZeJmena, iniciály, type Efekt } from "@/lib/avatar";

/**
 * Avatar.
 *
 * Iniciály na barvě odvozené ze jména. Volitelný efekt kolem
 * kolečka — vždycky kolem, nikdy uvnitř: obarvení vnitřku by
 * přebilo fotku a ta by zmizela.
 */

export default function Avatar({
  jmeno,
  url,
  velikost = 34,
  efekt = "zadny",
}: {
  jmeno: string | null | undefined;
  url?: string | null;
  velikost?: number;
  efekt?: Efekt;
}) {
  const j = jmeno?.trim() || "?";
  const b = barvaZeJmena(j);

  const jadro = url ? (
    // Obyčejný obrázek — optimalizace je v projektu vypnutá,
    // takže by next/image nic nepřinesl.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={j}
      className="av-foto"
      style={{ width: velikost, height: velikost }}
    />
  ) : (
    <span
      className="av-kolo"
      style={{
        width: velikost,
        height: velikost,
        background: b.pozadi,
        color: b.text,
        fontSize: Math.round(velikost * 0.38),
      }}
    >
      {iniciály(j)}
    </span>
  );

  if (efekt === "zadny") {
    return <span className="av" style={{ width: velikost, height: velikost }} aria-label={j}>{jadro}</span>;
  }

  return (
    <span
      className={`av av--${efekt}`}
      style={{ width: velikost, height: velikost }}
      aria-label={j}
    >
      {efekt === "jadro" && (
        <>
          <span className="av-prsten av-prsten--1" aria-hidden="true" />
          <span className="av-prsten av-prsten--2" aria-hidden="true" />
        </>
      )}
      {efekt === "koruna" && (
        <svg className="av-koruna" viewBox="0 0 24 14" aria-hidden="true">
          <path d="M2 12 L1 3 L6 7.5 L12 1 L18 7.5 L23 3 L22 12 Z" fill="currentColor" />
        </svg>
      )}
      {jadro}
      {efekt === "sken" && <span className="av-sken" aria-hidden="true" />}
    </span>
  );
}
