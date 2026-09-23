"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application boundary caught:", error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <section style={{ maxWidth: 440, textAlign: "center", border: "1px solid #e5e7eb", borderRadius: 18, padding: 24 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Tampilan perlu dimuat ulang</h1>
            <p style={{ margin: "0 0 18px", color: "#64748b", lineHeight: 1.5 }}>
              Aplikasi baru saja diperbarui atau ada file browser yang belum sinkron.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={reset} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "white" }}>Coba Lagi</button>
              <button type="button" onClick={() => window.location.reload()} style={{ padding: "10px 14px", borderRadius: 10, border: 0, background: "#1f2937", color: "white" }}>Muat Ulang</button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
