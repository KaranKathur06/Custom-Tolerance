`"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

export function AdminOtpBypassBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/admin/otp/bypass/status", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { showBanner?: boolean }) => {
        if (!cancelled) setVisible(Boolean(data.showBanner));
      })
      .catch(() => {
        if (!cancelled) setVisible(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900"
    >
      <span className="inline-flex items-center gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
        OTP bypass active for Super Admin
      </span>
    </div>
  );
}
