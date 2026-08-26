export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <span
      className="display inline-flex items-baseline select-none"
      style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.045em" }}
    >
      <span className="text-signal">BET</span>
      <span className="text-chalk">IMPERIUM</span>
    </span>
  );
}
