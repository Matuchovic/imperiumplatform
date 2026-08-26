"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Errors = {
  name?: string;
  email?: string;
  password?: string;
  birthDate?: string;
  terms?: string;
  form?: string;
};

/** Délka rozhoduje víc než míchání znaků — proto se hlídá hlavně ona. */
function strength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (pw.length < 10) return { score: 0, label: "Krátké" };
  let bonus = 0;
  if (pw.length >= 14) bonus++;
  if (/[^a-zA-Z0-9]/.test(pw)) bonus++;
  if (bonus === 0) return { score: 1, label: "Ujde" };
  if (bonus === 1) return { score: 2, label: "Dobré" };
  return { score: 3, label: "Silné" };
}

export default function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const pw = strength(password);

  function validate(): boolean {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = "Zadej jméno.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = "Tenhle e-mail nemá platný tvar.";
    if (password.length < 10) e.password = "Aspoň 10 znaků.";
    if (!birthDate) e.birthDate = "Zadej datum narození.";
    else {
      const limit = new Date();
      limit.setFullYear(limit.getFullYear() - 18);
      if (new Date(birthDate) > limit) e.birthDate = "Službu smí používat jen osoby od 18 let.";
    }
    if (!terms) e.terms = "Bez souhlasu to bohužel nejde.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy || !validate()) return;

    setBusy(true);
    setErrors({});

    let res: Response;
    try {
      res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, birthDate, terms, marketing }),
      });
    } catch {
      setErrors({ form: "Nepodařilo se spojit se serverem. Zkontroluj připojení." });
      setBusy(false);
      return;
    }

    let data: { error?: string } | null = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      setErrors({ form: data?.error ?? `Registrace se nepodařila (chyba ${res.status}).` });
      setBusy(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
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

      <div>
        <label htmlFor="name" className="eyebrow mb-2 block">Jméno a příjmení</label>
        <div className="field-shell" data-invalid={Boolean(errors.name)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ash-2">
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id="name" name="name" type="text" autoComplete="name" placeholder="Jan Novák"
            value={name} onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
        </div>
        {errors.name && <p className="mt-1.5 text-[12.5px] text-loss/90">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="email" className="eyebrow mb-2 block">E-mail</label>
        <div className="field-shell" data-invalid={Boolean(errors.email)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ash-2">
            <rect x="3" y="5.5" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="m3.8 7 7.3 5.2a1.6 1.6 0 0 0 1.8 0L20.2 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id="email" name="email" type="email" autoComplete="email" inputMode="email"
            placeholder="tvuj@email.cz" value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
          />
        </div>
        {errors.email && <p className="mt-1.5 text-[12.5px] text-loss/90">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="password" className="eyebrow mb-2 block">Heslo</label>
        <div className="field-shell" data-invalid={Boolean(errors.password)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ash-2">
            <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id="password" name="password" type={show ? "text" : "password"}
            autoComplete="new-password" placeholder="Aspoň 10 znaků"
            value={password} onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
          <button
            type="button" onClick={() => setShow((s) => !s)}
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

        {password && (
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{
                    background:
                      pw.score > i
                        ? pw.score === 1 ? "#ffc94a" : "#7ef0a8"
                        : "rgba(255,255,255,0.07)",
                  }}
                />
              ))}
            </div>
            <span className="data text-[11px] text-ash">{pw.label}</span>
          </div>
        )}
        {errors.password && <p className="mt-1.5 text-[12.5px] text-loss/90">{errors.password}</p>}
      </div>

      <div>
        <label htmlFor="birthDate" className="eyebrow mb-2 block">Datum narození</label>
        <div className="field-shell" data-invalid={Boolean(errors.birthDate)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ash-2">
            <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id="birthDate" name="birthDate" type="date" autoComplete="bday"
            value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
            aria-invalid={Boolean(errors.birthDate)}
            aria-describedby="birth-hint"
          />
        </div>
        <p id="birth-hint" className="mt-1.5 text-[12px] text-ash-2">
          Služba je určena osobám od 18 let.
        </p>
        {errors.birthDate && <p className="mt-1 text-[12.5px] text-loss/90">{errors.birthDate}</p>}
      </div>

      <label className="flex cursor-pointer select-none items-start gap-2.5 text-[13px] leading-relaxed text-ash">
        <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <input
            type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)}
            className="peer absolute inset-0 cursor-pointer opacity-0"
            aria-invalid={Boolean(errors.terms)}
          />
          <span
            className="pointer-events-none flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-all"
            style={{
              borderColor: errors.terms
                ? "rgba(255,107,107,0.6)"
                : terms ? "rgba(126,240,168,0.75)" : "rgba(126,240,168,0.22)",
              background: terms ? "rgba(126,240,168,0.16)" : "transparent",
            }}
          >
            {terms && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="m5 12.5 4.5 4.5L19 7" stroke="#7ef0a8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        </span>
        <span>
          Souhlasím s{" "}
          <a href="/podminky" className="text-signal hover:underline">obchodními podmínkami</a>{" "}
          a{" "}
          <a href="/soukromi" className="text-signal hover:underline">zpracováním osobních údajů</a>.
        </span>
      </label>
      {errors.terms && <p className="-mt-2 text-[12.5px] text-loss/90">{errors.terms}</p>}

      <label className="flex cursor-pointer select-none items-start gap-2.5 text-[13px] leading-relaxed text-ash">
        <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <input
            type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)}
            className="peer absolute inset-0 cursor-pointer opacity-0"
          />
          <span
            className="pointer-events-none flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-all"
            style={{
              borderColor: marketing ? "rgba(126,240,168,0.75)" : "rgba(126,240,168,0.22)",
              background: marketing ? "rgba(126,240,168,0.16)" : "transparent",
            }}
          >
            {marketing && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="m5 12.5 4.5 4.5L19 7" stroke="#7ef0a8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        </span>
        <span>Chci dostávat novinky a nabídky. Nepovinné, kdykoliv se dá vypnout.</span>
      </label>

      <button type="submit" className="btn-primary mt-1" disabled={busy}>
        {busy ? (
          <>
            <span className="spinner" />
            Zakládám účet…
          </>
        ) : (
          <>
            Založit účet
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>

      <p className="mt-1 text-center text-[13px] text-ash">
        Už máš účet?{" "}
        <a href="/login" className="font-medium text-signal hover:underline">Přihlas se</a>
      </p>
    </form>
  );
}
