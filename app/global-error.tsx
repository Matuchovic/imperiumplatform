"use client";

import { useEffect } from "react";

/**
 * Poslední záchrana.
 *
 * Chytá chyby, které nastanou v kořenovém rozvržení — tam už
 * nezabírá error.tsx jednotlivých sekcí. Bez tohohle ukáže Next
 * holou hlášku „Application error" a člověk nemá co udělat.
 *
 * Musí nést vlastní html a body. V tomhle místě žádné okolí není.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[betimperium] kořenová chyba", error);

    /**
     * Zastaralá část kódu po nasazení se pozná podle hlášky.
     * Jediné rozumné řešení je obnovit — ale jen jednou, aby
     * z toho nebyla smyčka, kdyby byla příčina jinde.
     */
    const zprava = String(error?.message ?? "");
    const jeCast =
      zprava.includes("ChunkLoadError") ||
      zprava.includes("Loading chunk") ||
      zprava.includes("Failed to fetch dynamically imported module") ||
      zprava.includes("Importing a module script failed") ||
      zprava.includes("Load failed");

    if (!jeCast) return;

    try {
      if (sessionStorage.getItem("bi:obnoveno-po-padu")) return;
      sessionStorage.setItem("bi:obnoveno-po-padu", "1");
    } catch {
      return;
    }

    void (async () => {
      try {
        if ("caches" in window) {
          const klice = await caches.keys();
          await Promise.all(klice.map((k) => caches.delete(k)));
        }
      } catch { /* obnovit se má i tak */ }
      window.location.reload();
    })();
  }, [error]);

  return (
    <html lang="cs">
      <body style={{
        margin: 0,
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#050706",
        color: "#dff5e8",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        <div style={{
          maxWidth: 460,
          width: "100%",
          padding: "28px 24px",
          borderRadius: 16,
          background: "rgba(12,19,16,0.8)",
          border: "1px solid rgba(255,107,107,0.24)",
          textAlign: "center",
        }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            Aplikaci se nepodařilo načíst
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6, color: "#8fa396" }}>
            Většinou stačí obnovit stránku. Pokud to nepomůže, odhlas se
            a přihlas znovu.
          </p>

          <pre style={{
            margin: "18px 0 0",
            padding: "11px 13px",
            borderRadius: 10,
            background: "rgba(1,6,4,0.8)",
            border: "1px solid rgba(255,107,107,0.16)",
            fontSize: 11.5,
            lineHeight: 1.6,
            color: "#ffb3b3",
            textAlign: "left",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {error?.message || "Bez bližšího popisu."}
          </pre>

          <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                height: 40, padding: "0 18px", borderRadius: 10, border: 0,
                background: "#7ef0a8", color: "#04140a",
                fontSize: 13.5, fontWeight: 500, cursor: "pointer",
              }}
            >
              Zkusit znovu
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                height: 40, padding: "0 18px", borderRadius: 10,
                border: "1px solid rgba(126,240,168,0.2)",
                background: "transparent", color: "#cfe6d8",
                fontSize: 13.5, cursor: "pointer",
              }}
            >
              Obnovit stránku
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
