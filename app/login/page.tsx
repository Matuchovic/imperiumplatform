import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Logo from "@/components/brand/Logo";
import PozadiSystemu from "@/components/effects/PozadiSystemu";
import { VERZE } from "@/lib/verze";

/* Skořápka bez uživatelských dat — může se předgenerovat
   a servírovat z okraje sítě místo vykreslení na serveru. */
export const dynamic = "force-static";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="page-bg" aria-hidden="true">
        <PozadiSystemu />
        <div className="page-bg__stred" />
        <div className="page-bg__wash" />
        <div className="page-bg__edge" />
      </div>

      <div className="relative z-10 w-full max-w-[430px]">
        {/* značka nad panelem, aby pozadí zůstalo hlavním hrdinou */}
        <div className="rise mb-7 flex flex-col items-center" style={{ animationDelay: "60ms" }}>
          <Logo size={26} />
          <p className="eyebrow mt-2.5">Systém sázkového poradenství</p>
        </div>

        <section className="panel rise px-7 py-8 sm:px-8" style={{ animationDelay: "180ms" }}>
          {/* stavový proužek — nahrazuje "social proof" widget z webu,
              ale říká jen to, co systém opravdu ví */}
          <div
            className="mb-6 flex items-center justify-between rounded-lg px-3 py-2"
            style={{ background: "rgba(126,240,168,0.05)", border: "1px solid rgba(126,240,168,0.1)" }}
          >
            <span className="flex items-center gap-2">
              <span className="pulse-dot" />
              <span className="eyebrow" style={{ color: "#7ef0a8" }}>
                Systém běží
              </span>
            </span>
            <span className="data text-[11px] text-ash-2">v{VERZE}</span>
          </div>

          <h1 className="display text-[26px] font-semibold leading-tight text-chalk">
            Přihlášení
          </h1>
          <p className="mb-6 mt-1.5 text-[14px] leading-relaxed text-ash">
            Zadejte přihlašovací údaje ke svému účtu.
          </p>

          <Suspense fallback={<div className="h-[420px]" />}>
            <LoginForm />
          </Suspense>

          <p className="data mt-5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-center text-[9.5px] tracking-[0.12em] text-ash-2">
            <span>BETIMPERIUM s.r.o.</span>
            <span aria-hidden="true">·</span>
            {/* Až vznikne testovací instance, tohle je jediná věc, která
                zabrání práci v ostrém provozu omylem. */}
            <span>{process.env.NEXT_PUBLIC_PROSTREDI ?? "PRODUKČNÍ PROSTŘEDÍ"}</span>
          </p>
        </section>

        <div
          className="rise mt-6 flex items-center justify-center gap-2 text-[12px] text-ash-2"
          style={{ animationDelay: "320ms" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          Spojení je šifrované. Heslo nikdy neposíláme e-mailem.
        </div>

        <p className="mt-5 text-center text-[11.5px] leading-relaxed text-ash-2/80">
          Sázení je určeno osobám od 18 let a nese riziko finanční ztráty.
          Žádné doporučení negarantuje zisk.
        </p>
      </div>
    </main>
  );
}
