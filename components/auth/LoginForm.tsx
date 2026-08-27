"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WelcomeScreen from "@/components/welcome/WelcomeScreen";
import { supabaseBrowser } from "@/lib/supabase/client";
import { odemkniZvuk } from "@/lib/zvuk/prehravac";

type Errors = { email?: string; password?: string; form?: string };

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [welcome, setWelcome] = useState<{ name: string; plan: string } | null>(null);

  function validate(): boolean {
    const e: Errors = {};
    if (!email.trim()) e.email = "Zadej e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = "E-mail nemá platný tvar.";
    if (!password) e.password = "Zadej heslo.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    /**
     * Odemčení zvuku z klepnutí na Přihlásit se.
     *
     * Prohlížeč přehrávání povolí až po interakci. Tohle je
     * poslední klepnutí před vstupem do systému, takže se
     * uvítání po přesměrování ozve.
     */
    odemkniZvuk();

    ev.preventDefault();
    if (busy || !validate()) return;

    setBusy(true);
    setErrors({});

    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Supabase vrací stejnou hlášku pro neexistující účet i špatné heslo —
      // neprozrazuje tím, které e-maily jsou registrované.
      setErrors({
        form:
          error.message === "Invalid login credentials"
            ? "E-mail nebo heslo nesouhlasí."
            : error.message === "Email not confirmed"
            ? "Nejprve potvrďte e-mail podle odkazu, který jsme vám poslali."
            : `Přihlášení se nepodařilo: ${error.message}`,
      });
      setBusy(false);
      return;
    }

    router.prefetch(next);
    setWelcome({
      name: (data.user?.user_metadata?.name as string) ?? email.split("@")[0],
      plan: (data.user?.user_metadata?.plan as string) ?? "start",
    });
  }

  if (welcome) {
    return (
      <WelcomeScreen
        name={welcome.name}
        plan={welcome.plan}
        onDone={() => {
          router.push(next);
          router.refresh();
        }}
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {/* chyba celého formuláře */}
      {errors.form && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-snug"
          style={{
            background: "rgba(255,107,107,0.07)",
            border: "1px solid rgba(255,107,107,0.24)",
            color: "#ffb4b4",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="mt-px shrink-0">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 7.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.1" fill="currentColor" />
          </svg>
          <span>{errors.form}</span>
        </div>
      )}

      {/* e-mail */}
      <div>
        <label htmlFor="email" className="eyebrow mb-2 block">
          E-mail
        </label>
        <div className="field-shell" data-invalid={Boolean(errors.email)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ash-2">
            <rect x="3" y="5.5" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="m3.8 7 7.3 5.2a1.6 1.6 0 0 0 1.8 0L20.2 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="jmeno@betimperium.cz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-err" : undefined}
          />
        </div>
        {errors.email && (
          <p id="email-err" className="mt-1.5 text-[12.5px] text-loss/90">
            {errors.email}
          </p>
        )}
      </div>

      {/* heslo */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="password" className="eyebrow">
            Heslo
          </label>
          <a
            href="/obnova-hesla"
            className="text-[12.5px] text-ash transition-colors hover:text-signal"
          >
            Zapomenuté heslo?
          </a>
        </div>
        <div className="field-shell" data-invalid={Boolean(errors.password)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ash-2">
            <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "pw-err" : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Skrýt heslo" : "Zobrazit heslo"}
            className="tap shrink-0 rounded-md p-1 text-ash-2 transition-colors hover:text-signal"
          >
            {show ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.8 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M6.5 6.7C4.6 8 3.2 9.9 2.5 12c1.5 4 5.2 6.5 9.5 6.5 1.7 0 3.3-.4 4.7-1.1M9.9 5.7c.7-.1 1.4-.2 2.1-.2 4.3 0 8 2.5 9.5 6.5-.5 1.4-1.3 2.7-2.3 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M2.5 12C4 8 7.7 5.5 12 5.5S20 8 21.5 12c-1.5 4-5.2 6.5-9.5 6.5S4 16 2.5 12Z" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && (
          <p id="pw-err" className="mt-1.5 text-[12.5px] text-loss/90">
            {errors.password}
          </p>
        )}
      </div>

      {/* zůstat přihlášen */}
      <label className="flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-ash">
        <span className="relative flex h-[18px] w-[18px] items-center justify-center">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="peer absolute inset-0 cursor-pointer opacity-0"
          />
          <span
            className="pointer-events-none flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-all"
            style={{
              borderColor: remember ? "rgba(126,240,168,0.75)" : "rgba(126,240,168,0.22)",
              background: remember ? "rgba(126,240,168,0.16)" : "transparent",
            }}
          >
            {remember && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="m5 12.5 4.5 4.5L19 7" stroke="#7ef0a8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        </span>
        Zůstat přihlášen
      </label>

      <button type="submit" className="btn-primary mt-1" disabled={busy}>
        {busy ? (
          <>
            <span className="spinner" />
            Ověřuji…
          </>
        ) : (
          <>
            Přihlásit se
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>

      <div className="my-1 flex items-center gap-3">
        <span className="h-px flex-1" style={{ background: "rgba(126,240,168,0.12)" }} />
        <span className="eyebrow">nebo</span>
        <span className="h-px flex-1" style={{ background: "rgba(126,240,168,0.12)" }} />
      </div>

      <button type="button" className="btn-ghost">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.8 4.2 2.9 11.5c-1 .4-1 1.8 0 2.2l4.8 1.6 1.8 5.5c.3.9 1.4 1.1 2 .4l2.6-2.7 4.9 3.6c.7.5 1.7.1 1.9-.7l3-15.3c.2-.9-.7-1.6-1.5-1.3Z" />
        </svg>
        Přihlásit firemním účtem
      </button>

      <p className="mt-4 border-t border-signal/10 pt-4 text-center text-[12.5px] leading-relaxed text-ash-2">
        Účty zřizuje správce systému. Potřebujete-li přístup, obraťte se
        na svého nadřízeného.
      </p>
    </form>
  );
}
