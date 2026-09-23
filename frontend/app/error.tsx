"use client";

import { useEffect } from "react";

function isChunkOrHydrationError(error: Error & { digest?: string }) {
  const message = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();
  return (
    message.includes("chunk") ||
    message.includes("loading css chunk") ||
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("react client manifest") ||
    message.includes("older or newer deployment") ||
    message.includes("server action")
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application client boundary caught:", error);
  }, [error]);

  const likelyStaleBuild = isChunkOrHydrationError(error);

  const reloadFresh = () => {
    if (typeof window === "undefined") return;
    window.location.reload();
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-background p-6 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          !
        </div>
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          Tampilan perlu dimuat ulang
        </h1>
        <p className="mb-5 text-sm text-muted-foreground">
          {likelyStaleBuild
            ? "Versi aplikasi di browser masih menyimpan file lama. Muat ulang halaman untuk mengambil versi terbaru."
            : "Terjadi gangguan saat memuat halaman. Coba ulangi atau muat ulang halaman."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Coba Lagi
          </button>
          <button
            type="button"
            onClick={reloadFresh}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    </div>
  );
}
