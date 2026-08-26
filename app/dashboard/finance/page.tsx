import Placeholder from "@/components/admin/Placeholder";

export default function Page() {
  return (
    <Placeholder
      title="Finance"
      lead="Tržby, platby a výplaty."
      points={[
        "Tržby po dnech a měsících",
        "Neprošlé platby a jejich řešení",
        "Podklady pro účetnictví",
      ]}
    />
  );
}
