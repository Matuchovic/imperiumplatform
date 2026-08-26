import Placeholder from "@/components/admin/Placeholder";

export default function Page() {
  return (
    <Placeholder
      title="Analytika"
      lead="Jestli systém funguje, ne jestli se dařilo."
      points={[
        "CLV jako hlavní ukazatel — ustálí se dřív než zisk",
        "ROI s intervalem spolehlivosti, ne holé číslo",
        "Rozpad podle sportu, trhu a kanceláře",
        "Simulace rozptylu na dalších období",
      ]}
    />
  );
}
