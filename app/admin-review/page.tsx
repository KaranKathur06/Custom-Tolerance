"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";

type ExchangeState = "connecting" | "denied";

export default function AdminReviewAccessPage() {
  const [state, setState] = useState<ExchangeState>("connecting");

  useEffect(() => {
    let active = true;

    async function exchangeAccessKey() {
      const fragment = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const key = new URLSearchParams(fragment).get("key");

      window.history.replaceState(null, "", window.location.pathname);

      if (!key) {
        if (active) setState("denied");
        return;
      }

      try {
        const response = await fetch("/api/admin/review-access", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        const payload = (await response.json()) as { destination?: string };

        if (!response.ok || payload.destination !== "/ops/admin?review=active") {
          throw new Error("Review access denied");
        }

        window.location.replace(payload.destination);
      } catch {
        if (active) setState("denied");
      }
    }

    void exchangeAccessKey();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        {state === "connecting" ? (
          <>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold">Opening review workspace</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Establishing the temporary, audited administrator session.
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              Verifying secure access…
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
              <ShieldX className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold">Review access unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              This temporary link is invalid, expired, or has been disabled.
            </p>
          </>
        )}
      </section>
    </main>
  );
}

