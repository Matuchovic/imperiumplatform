"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Jadro from "@/components/asistent/Jadro";
import { jeTym, type Role } from "./nav";
import type { Efekt } from "@/lib/avatar";
import Tep from "@/components/pritomnost/Tep";
import OdemkniZvuk from "@/components/pritomnost/OdemkniZvuk";
import Uvitani from "@/components/asistent/Uvitani";

/**
 * Skořápka administrace.
 *
 * Stav zásuvky drží tahle komponenta, ne Sidebar — jinak by tlačítko
 * v horní liště nemělo jak zásuvku otevřít a muselo by plavat nad
 * obsahem. Přesně to byl problém původního řešení na telefonu.
 */
export default function Shell({
  name,
  role,
  demo,
  efekt = "zadny",
  jaId,
  children,
}: {
  name: string;
  role: Role;
  demo: number;
  efekt?: Efekt;
  jaId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Pod otevřenou zásuvkou se nesmí rolovat stránka vzadu.
  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
    return () => document.body.classList.remove("no-scroll");
  }, [open]);

  // Escape zavírá, stejně jako klepnutí vedle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="adm-shell">
      <Sidebar role={role} open={open} onClose={() => setOpen(false)} />

      <div className="adm-main">
        <Tep />
        <OdemkniZvuk />
        <Uvitani jmeno={name} />

        <Topbar
          name={name}
          role={role}
          efekt={efekt}
          jaId={jaId}
          otevreneMenu={open}
          // Křížek zavírá, hamburger otevírá — jedno tlačítko
          // pro obojí je na telefonu přirozenější než dvě.
          onMenu={() => setOpen((o) => !o)}
        />

        {demo > 0 && (
          <div className="demo-bar" role="status">
            <span>
              <strong>Ukázková data.</strong> V systému je {demo}{" "}
              {demo === 1 ? "ukázkový klient" : demo < 5 ? "ukázkoví klienti" : "ukázkových klientů"}.
            </span>
            <span className="data demo-bar__how">DELETE /api/demo/seed</span>
          </div>
        )}

        <div className="adm-body">{children}</div>
      </div>

      {/* Asistent je pro tým, ne pro klienty. */}
      {jeTym(role) && <Jadro />}
    </div>
  );
}
