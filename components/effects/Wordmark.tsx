/**
 * Střídá BETIMPERIUM a MANAGEMENT. Obě slova leží přes sebe a mají
 * posunutou fázi téže animace — nic se nepřepíná ve stavu komponenty,
 * takže se React při každé výměně nepřekresluje.
 *
 * Pro odečítač obrazovky je to dekorace; přístupný název nese celá
 * úvodní obrazovka, aby se nápis nečetl každé dvě vteřiny znovu.
 */
export default function Wordmark() {
  return (
    <span className="wm" aria-hidden="true">
      <span className="wm__halo" />

      <span className="wm__ghost wm__ghost--r">BETIMPERIUM</span>
      <span className="wm__ghost wm__ghost--c">BETIMPERIUM</span>
      <span className="wm__word">
        <span style={{ color: "#7ef0a8" }}>BET</span>
        <span style={{ color: "#ffffff" }}>IMPERIUM</span>
      </span>

      <span className="wm__ghost wm__ghost--r wm__b">MANAGEMENT</span>
      <span className="wm__ghost wm__ghost--c wm__b">MANAGEMENT</span>
      <span className="wm__word wm__b" style={{ color: "#e8fff2" }}>
        MANAGEMENT
      </span>
    </span>
  );
}
