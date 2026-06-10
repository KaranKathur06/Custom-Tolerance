"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearGuestRfqDraft,
  createEmptyGuestRfqDraft,
  readGuestRfqDraft,
  writeGuestRfqDraft,
  type GuestRfqDraft,
} from "@/lib/marketplace/guest-rfq";

export function useGuestRfq(initialSupplierSlug?: string | null) {
  const [draft, setDraft] = useState<GuestRfqDraft>(() => {
    const existing = readGuestRfqDraft();
    if (existing) return existing;
    const empty = createEmptyGuestRfqDraft();
    if (initialSupplierSlug) empty.supplierSlug = initialSupplierSlug;
    return empty;
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const existing = readGuestRfqDraft();
    if (existing) {
      setDraft(
        initialSupplierSlug && !existing.supplierSlug
          ? { ...existing, supplierSlug: initialSupplierSlug }
          : existing,
      );
    } else if (initialSupplierSlug) {
      setDraft((prev) => ({ ...prev, supplierSlug: initialSupplierSlug }));
    }
    setHydrated(true);
  }, [initialSupplierSlug]);

  const updateDraft = useCallback((patch: Partial<GuestRfqDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      writeGuestRfqDraft(next);
      return next;
    });
  }, []);

  const resetDraft = useCallback(() => {
    clearGuestRfqDraft();
    const empty = createEmptyGuestRfqDraft();
    if (initialSupplierSlug) empty.supplierSlug = initialSupplierSlug;
    setDraft(empty);
  }, [initialSupplierSlug]);

  return {
    draft,
    updateDraft,
    resetDraft,
    clearDraft: clearGuestRfqDraft,
    hydrated,
  };
}
