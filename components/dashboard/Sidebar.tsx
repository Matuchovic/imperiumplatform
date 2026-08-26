"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/brand/Logo";

const NAV = [
  { label: "Přehled", href: "/dashboard" },
  { label: "Motor hodnoty", href: "/dashboard/motor" },
  { label: "Tikety", href: "/dashboard/tikety" },
  { label: "Můj plán", href: "/dashboard/plan" },
  { label: "Bankroll", href: "/dashboard/bankroll" },
  { label: "Statistiky", href: "/dashboard/statistiky" },
  { label: "Telegram", href: "/dashboard/telegram" },
  { label: "Nastavení", href: "/dashboard/nastaveni" },
];

export default function Sidebar({ plan }: { plan: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV.map((item) => {
    const active =
      item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className="rounded-lg px-3 py-2.5 text-[14px] transition-colors"
        style={
          active
            ? { background: "rgba(126,240,168,0.1)", color: "#ecfdf2", border: "1px solid rgba(126,240,168,0.16)" }
            : { color: "#8fa396", border: "1px solid transparent" }
        }
      >
        {item.label}
      </Link>
    );
  });

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Zavřít menu" : "Otevřít menu"}
        className="fixed left-4 top-4 z-40 rounded-lg px-3 py-2 text-[13px] text-ash lg:hidden"
        style={{ background: "rgba(12,19,16,0.9)", border: "1px solid rgba(126,240,168,0.14)" }}
      >
        Menu
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[236px] shrink-0 flex-col p-5 transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${
          open ? "flex translate-x-0" : "hidden lg:flex -translate-x-full"
        }`}
        style={{ borderRight: "1px solid rgba(126,240,168,0.09)", background: "#050706" }}
      >
        <div className="mb-8 px-1 pt-10 lg:pt-0">
          <Logo size={19} />
        </div>

        <nav className="flex flex-col gap-1">{items}</nav>

        <div
          className="mt-auto rounded-xl p-4"
          style={{ background: "rgba(126,240,168,0.05)", border: "1px solid rgba(126,240,168,0.12)" }}
        >
          <p className="eyebrow" style={{ color: "#7ef0a8" }}>
            Plán {plan}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ash">
            Manažer odpovídá na Telegramu obvykle do 30 minut.
          </p>
        </div>
      </aside>
    </>
  );
}
