import Placeholder from "@/components/admin/Placeholder";

export default function Page() {
  return (
    <Placeholder
      title="Klienti"
      lead="Kdo dnes potřebuje pozornost a proč."
      points={[
        "Triáž seřazená podle naléhavosti, ne podle abecedy",
        "Konkrétní důvod u každého řádku — ne skóre",
        "Detail klienta: bankroll, plán, historie tiketů",
        "Upozornění na honění ztrát a sázení mimo plán",
      ]}
    />
  );
}
