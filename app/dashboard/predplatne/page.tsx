import Placeholder from "@/components/admin/Placeholder";

export default function Page() {
  return (
    <Placeholder
      title="Předplatné"
      lead="Kdo platí, komu končí členství a kdo odešel."
      points={[
        "Čistý pohyb místo hrubých registrací",
        "Blížící se konce členství a neprošlé platby",
        "Důvody zrušení a jejich vývoj v čase",
      ]}
    />
  );
}
