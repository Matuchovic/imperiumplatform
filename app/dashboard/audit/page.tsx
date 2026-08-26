import Placeholder from "@/components/admin/Placeholder";

export default function Page() {
  return (
    <Placeholder
      title="Audit log"
      lead="Kdo co změnil a kdy."
      points={[
        "Nemazatelná stopa schválení tiketů",
        "Změny limitů a rolí",
        "Podklad pro spor s klientem i pro regulátora",
      ]}
    />
  );
}
