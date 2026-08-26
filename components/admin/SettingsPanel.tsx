"use client";

import { useState } from "react";

export type Settings = {
  platform_name: string;
  tagline: string;
  description: string;
  language: string;
  currency: string;
  timezone: string;
  week_start: string;
  allow_signup: boolean;
  allow_trial: boolean;
  approve_clients: boolean;
  require_2fa_staff: boolean;
  default_units: number;
  default_sport: string;
  tip_expiry_minutes: number;
  default_week_limit: number;
  default_loss_limit: number;
  reality_check_min: number;
  retention_days: number;
};

const TABS = [
  { key: "obecne", label: "Obecné" },
  { key: "tipy", label: "Tipy" },
  { key: "hraci", label: "Ochrana hráčů" },
  { key: "bezpecnost", label: "Bezpečnost" },
  { key: "integrace", label: "Integrace" },
  { key: "system", label: "Systém" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function SettingsPanel({ initial }: { initial: Settings }) {
  const [tab, setTab] = useState<Tab>("obecne");
  const [form, setForm] = useState<Settings>(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setMsg(null);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg({ tone: "bad", text: data?.error ?? `Uložení selhalo (${res.status}).` });
      } else {
        setDirty(false);
        setMsg({ tone: "ok", text: "Uloženo." });
      }
    } catch {
      setMsg({ tone: "bad", text: "Nepodařilo se spojit se serverem." });
    }
    setBusy(false);
  }

  return (
    <>
      <div className="set-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`set-tab ${tab === t.key ? "set-tab--on" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "obecne" && (
        <div className="set-grid">
          <Card title="Základní informace">
            <Text label="Název platformy" value={form.platform_name} onChange={(v) => set("platform_name", v)} />
            <Text label="Slogan" value={form.tagline} onChange={(v) => set("tagline", v)} />
            <Area label="Krátký popis" value={form.description} onChange={(v) => set("description", v)} />
          </Card>

          <Card title="Region a čas">
            <Select label="Jazyk" value={form.language} onChange={(v) => set("language", v)}
              options={[["cs", "Čeština"], ["sk", "Slovenština"], ["en", "English"]]} />
            <Select label="Měna" value={form.currency} onChange={(v) => set("currency", v)}
              options={[["CZK", "CZK — koruna česká"], ["EUR", "EUR — euro"]]} />
            <Select label="Časové pásmo" value={form.timezone} onChange={(v) => set("timezone", v)}
              options={[["Europe/Prague", "Praha, Bratislava (UTC+2)"], ["UTC", "UTC"]]} />
            <Select label="První den týdne" value={form.week_start} onChange={(v) => set("week_start", v)}
              options={[["monday", "Pondělí"], ["sunday", "Neděle"]]} />
          </Card>

          <Card title="Registrace">
            <Toggle label="Povolit registrace" hint="Bez toho se nikdo nový nezaregistruje."
              on={form.allow_signup} onChange={(v) => set("allow_signup", v)} />
            <Toggle label="Povolit zkušební období" hint="Nový účet dostane přístup před platbou."
              on={form.allow_trial} onChange={(v) => set("allow_trial", v)} />
            <Toggle label="Schvalovat nové klienty ručně" hint="Účet čeká na potvrzení administrátorem."
              on={form.approve_clients} onChange={(v) => set("approve_clients", v)} />
          </Card>
        </div>
      )}

      {tab === "tipy" && (
        <div className="set-grid">
          <Card title="Výchozí hodnoty tipu">
            <Num label="Výchozí sázka v jednotkách" value={form.default_units} step={0.5}
              onChange={(v) => set("default_units", v)} />
            <Select label="Výchozí sport" value={form.default_sport} onChange={(v) => set("default_sport", v)}
              options={[["fotbal", "Fotbal"], ["hokej", "Hokej"], ["tenis", "Tenis"], ["basketbal", "Basketbal"]]} />
            <Num label="Platnost tipu v minutách" value={form.tip_expiry_minutes} step={15}
              hint="Po vypršení se tip označí jako neplatný, i když kurz drží. Nula vypne."
              onChange={(v) => set("tip_expiry_minutes", v)} />
          </Card>
        </div>
      )}

      {tab === "hraci" && (
        <div className="set-grid">
          <Card title="Výchozí limity nového klienta" tone="warn">
            <p className="set-lead">
              Klient si je může kdykoliv snížit. Zvýšení se projeví až po sedmi dnech —
              ta prodleva je schválně, aby limit nešel odklikat ve chvíli, kdy se nedaří.
            </p>
            <Num label="Týdenní strop sázek (Kč)" value={form.default_week_limit} step={500}
              onChange={(v) => set("default_week_limit", v)} />
            <Num label="Měsíční strop ztráty (Kč)" value={form.default_loss_limit} step={500}
              onChange={(v) => set("default_loss_limit", v)} />
            <Num label="Připomenutí času po (min)" value={form.reality_check_min} step={15}
              hint="Upozorní klienta, jak dlouho už je v aplikaci."
              onChange={(v) => set("reality_check_min", v)} />
          </Card>
        </div>
      )}

      {tab === "bezpecnost" && (
        <div className="set-grid">
          <Card title="Přihlašování">
            <Toggle label="Vyžadovat dvoufázové ověření u týmu"
              hint="Platí pro manažery a adminy. Klientů se netýká — vynucení u všech by okamžitě odřízlo ty, kdo ho nemají nastavené."
              on={form.require_2fa_staff} onChange={(v) => set("require_2fa_staff", v)} />
          </Card>
          <Card title="Uchovávání dat">
            <Num label="Archivovat záznamy po (dnech)" value={form.retention_days} step={30}
              hint="Osobní údaje se nesmí držet déle, než je potřeba. Audit log a doklady mají vlastní, delší lhůtu."
              onChange={(v) => set("retention_days", v)} />
          </Card>
        </div>
      )}

      {(tab === "integrace" || tab === "system") && (
        <div className="adm-panel">
          <p className="adm-panel__title">
            {tab === "integrace" ? "Integrace" : "Systém"}
          </p>
          <p className="adm-panel__lead" style={{ marginBottom: 0 }}>
            {tab === "integrace"
              ? "Telegram, poskytovatel kurzů a platební brána. Klíče se nastavují v proměnných prostředí, ne tady — do databáze nepatří."
              : "Verze, zálohy a systémový log. Připravuje se."}
          </p>
        </div>
      )}

      <div className="set-bar">
        {msg && <span className={`set-msg set-msg--${msg.tone}`}>{msg.text}</span>}
        {dirty && !msg && <span className="set-msg">Máš neuložené změny.</span>}
        <button className="adm-btn adm-btn--primary" onClick={save} disabled={busy || !dirty}>
          {busy ? "Ukládám…" : "Uložit změny"}
        </button>
      </div>
    </>
  );
}

/* ---------- stavební prvky ---------- */

function Card({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "warn";
  children: React.ReactNode;
}) {
  return (
    <section className={`set-card ${tone === "warn" ? "set-card--warn" : ""}`}>
      <p className="set-card__title">{title}</p>
      {children}
    </section>
  );
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="set-field">
      <span className="set-field__label">{label}</span>
      <input className="set-input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="set-field">
      <span className="set-field__label">{label}</span>
      <textarea className="set-input set-input--area" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Num({
  label, value, onChange, step = 1, hint,
}: { label: string; value: number; onChange: (v: number) => void; step?: number; hint?: string }) {
  return (
    <label className="set-field">
      <span className="set-field__label">{label}</span>
      <input
        className="set-input data"
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <span className="set-field__hint">{hint}</span>}
    </label>
  );
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="set-field">
      <span className="set-field__label">{label}</span>
      <select className="set-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label, hint, on, onChange,
}: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="set-toggle">
      <span className="set-toggle__text">
        <span className="set-toggle__label">{label}</span>
        {hint && <span className="set-toggle__hint">{hint}</span>}
      </span>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`set-switch ${on ? "set-switch--on" : ""}`}
      >
        <span className="set-switch__knob" />
      </button>
    </div>
  );
}
