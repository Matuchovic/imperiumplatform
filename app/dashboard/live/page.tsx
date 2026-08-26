import Placeholder from "@/components/admin/Placeholder";

export default function Page() {
  return (
    <Placeholder
      title="Live centrum"
      lead="Zápasy, které právě běží."
      points={[
        "Rozehrané tikety a jejich průběžný stav",
        "Pohyb kurzu od vypsání po výkop",
        "Upozornění, když hodnota zmizí a tip přestává platit",
      ]}
    />
  );
}
