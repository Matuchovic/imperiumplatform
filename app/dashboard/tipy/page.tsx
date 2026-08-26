import Placeholder from "@/components/admin/Placeholder";

export default function Page() {
  return (
    <Placeholder
      title="Tipy"
      lead="Vydané tipy, jejich stav a výsledky."
      points={[
        "Seznam s filtrem podle stavu a sportu",
        "Detail tiketu s celým řetězcem výpočtu",
        "Závěrečný kurz a spočítané CLV",
        "Automatické vyhodnocení podle výsledků",
      ]}
    />
  );
}
