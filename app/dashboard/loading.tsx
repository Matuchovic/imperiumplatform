/**
 * Skeleton, ne spinner. Obrysy sedí na místa, kam se obsah načte,
 * takže layout po dokončení nepodskočí.
 */
function Block({ h, w = "100%" }: { h: number; w?: string }) {
  return (
    <div
      className="skeleton rounded-xl"
      style={{ height: h, width: w, background: "rgba(126,240,168,0.06)" }}
    />
  );
}

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Načítám">
      <div className="mb-8">
        <Block h={12} w="90px" />
        <div className="mt-3">
          <Block h={26} w="220px" />
        </div>
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Block h={104} />
        <Block h={104} />
        <Block h={104} />
        <Block h={104} />
      </div>
      <div className="mb-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Block h={230} />
        <Block h={230} />
      </div>
      <Block h={280} />
    </div>
  );
}
