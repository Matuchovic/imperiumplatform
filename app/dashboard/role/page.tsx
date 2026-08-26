import Placeholder from "@/components/admin/Placeholder";

export default function Page() {
  return (
    <Placeholder
      title="Role"
      lead="Kdo co smí."
      points={[
        "Přiřazení rolí klient, manažer, admin",
        "Změna role jen přes service_role — uživatel si ji nepřepíše sám",
      ]}
    />
  );
}
