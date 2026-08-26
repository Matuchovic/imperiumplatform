import Placeholder from "@/components/admin/Placeholder";

export default function Page() {
  return (
    <Placeholder
      title="Tým"
      lead="Manažeři a jejich knihy klientů."
      points={[
        "Kolik klientů kdo drží a jak se jim daří",
        "Zatížení a doba odezvy",
      ]}
    />
  );
}
