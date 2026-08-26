function Block({ h, w = "100%" }: { h: number; w?: string }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: 11, background: "rgba(126,240,168,0.06)" }} />;
}

/** Skeleton, ne spinner — obrysy sedí na místa, kam se obsah načte. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Načítám">
      <Block h={24} w="240px" />
      <div style={{ marginTop: 10 }}><Block h={14} w="380px" /></div>
      <div className="adm-cards" style={{ marginTop: 22 }}>
        <Block h={92} /><Block h={92} /><Block h={92} /><Block h={92} />
      </div>
      <div style={{ marginTop: 16 }}><Block h={190} /></div>
    </div>
  );
}
