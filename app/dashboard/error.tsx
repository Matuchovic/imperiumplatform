"use client";

import { useEffect } from "react";

/**
 * Chybová obrazovka sekce.
 *
 * Next bez ní ukáže jen „Application error" a text zůstane
 * v konzoli. U systému, kde se hledá po telefonu, je potřeba
 * ho vidět na obrazovce.
 */
export default function Chyba({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[betimperium]", error);

    /**
     * Zastaralá část kódu po nasazení. Obnovit jednou a mlčky —
     * ukazovat chybovou obrazovku u něčeho, co spraví obnovení,
     * jen mate.
     */
    const z = String(error?.message ?? "");
    if (!/ChunkLoadError|Loading chunk|dynamically imported module|Load failed/.test(z)) return;

    try {
      if (sessionStorage.getItem("bi:obnoveno-po-padu")) return;
      sessionStorage.setItem("bi:obnoveno-po-padu", "1");
      window.location.reload();
    } catch { /* soukromý režim */ }
  }, [error]);

  return (
    <div className="er-panel">
      <span className="er-znak">
        <i className="ti ti-alert-triangle" aria-hidden="true" />
      </span>

      <p className="er-nadpis">Tuhle část se nepodařilo načíst</p>
      <p className="er-popis">Zbytek systému funguje dál. Zkus to znovu.</p>

      <pre className="er-detail">{error.message || "Bez bližšího popisu."}</pre>
      {error.digest && <p className="data er-digest">otisk {error.digest}</p>}

      <div className="adm-actions" style={{ justifyContent: "center" }}>
        <button className="adm-btn adm-btn--primary" onClick={reset}>
          <i className="ti ti-refresh" aria-hidden="true" />
          Zkusit znovu
        </button>
        <a className="adm-btn" href="/dashboard">Zpět na přehled</a>
      </div>
    </div>
  );
}
