"use client";

import { useCallback, useEffect, useState } from "react";

export type SupplierOnboardingStatusData = {
  onboardingStatus: string;
  profileCompletionPercent: number;
  remainingItems: Array<{ label: string; section: string }>;
  emailVerified: boolean;
  mobileVerified: boolean;
  requiredDocumentsUploaded: boolean;
  marketplaceUnlocked: boolean;
  marketplaceGate: {
    allowed: boolean;
    hardBlocked: boolean;
    message: string;
    missingRequirements: string[];
  };
  trustScore: number;
  badges: Array<{ key: string; label: string; earned: boolean }>;
  changeRequestNotes: string | null;
  reviewNotes: string | null;
  developmentTrustMode: boolean;
};

export function useSupplierOnboardingStatus(enabled = true) {
  const [data, setData] = useState<SupplierOnboardingStatusData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/supplier/onboarding/status", { credentials: "include" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? "Failed to load onboarding status");
        return;
      }
      setData(payload.data);
    } catch {
      setError("Failed to load onboarding status");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
