import Placeholder from "@/components/admin/Placeholder";

export default function Page() {
  return (
    <Placeholder
      title="Úkoly"
      lead="Co je potřeba udělat a kým."
      points={[
        "Úkoly vzniklé z triáže klientů",
        "Přiřazení na členy týmu a termíny",
      ]}
    />
  );
}
