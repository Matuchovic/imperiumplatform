import ImperiumField from "@/components/background/ImperiumField";
import RegisterForm from "@/components/auth/RegisterForm";
import Logo from "@/components/brand/Logo";

export const metadata = {
  title: "BETIMPERIUM — registrace",
  robots: { index: false, follow: false },
};

export default function RegistracePage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-5 py-10">
      <ImperiumField />

      <div className="relative z-10 w-full max-w-[430px]">
        <div className="rise mb-7 flex flex-col items-center" style={{ animationDelay: "60ms" }}>
          <Logo size={26} />
          <p className="eyebrow mt-2.5">Systém sázkového poradenství</p>
        </div>

        <section className="panel rise px-6 py-8 sm:px-8" style={{ animationDelay: "180ms" }}>
          <h1 className="display text-[26px] font-semibold leading-tight text-chalk">
            Založ si účet
          </h1>
          <p className="mb-6 mt-1.5 text-[14px] leading-relaxed text-ash">
            Po registraci si nastavíš plán a bankroll. Platíš až potom.
          </p>

          <RegisterForm />
        </section>

        <p className="mt-5 text-center text-[11.5px] leading-relaxed text-ash-2/80">
          Sázení je určeno osobám od 18 let a nese riziko finanční ztráty.
          Žádné doporučení negarantuje zisk.
        </p>
      </div>
    </main>
  );
}
