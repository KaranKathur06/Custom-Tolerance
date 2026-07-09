/**
 * Hooks for Product Publishing Workflow
 * React hooks for managing seller products with publishing lifecycle
 */

import { useCallback, useEffect, useState } from "react";
import type { SellerProduct, ProductApproval } from "./publishing";

export function useSellerProducts() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/seller/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err: any) {
      setError(err?.message || "Error fetching products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}

export function usePublishProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/seller/products/${productId}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish");
      }
      return await res.json();
    } catch (err: any) {
      const msg = err?.message || "Publishing failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { publish, loading, error };
}

export function useProductApprovals(filter: "pending" | "approved" | "rejected" = "pending") {
  const [approvals, setApprovals] = useState<ProductApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/approvals?status=${filter}`);
      if (!res.ok) throw new Error("Failed to fetch approvals");
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch (err: any) {
      setError(err?.message || "Error fetching approvals");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  return { approvals, loading, error, refetch: fetchApprovals };
}

export function useSearchProducts(query: string, options: Record<string, any> = {}) {
  const [results, setResults] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ q: query, ...options });
    fetch(`/api/products/search?${params}`)
      .then((res) => res.json())
      .then((data) => setResults(data.products || []))
      .catch((err) => setError(err?.message || "Search failed"))
      .finally(() => setLoading(false));
  }, [query, options]);

  return { results, loading, error };
}

export function useProductEvents(since?: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (since) params.set("since", since);

    fetch(`/api/products/events?${params}`)
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []))
      .catch((err) => console.error("Event fetch failed:", err))
      .finally(() => setLoading(false));

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      const now = new Date();
      const fiveSecondsAgo = new Date(now.getTime() - 5000).toISOString();
      const params = new URLSearchParams({ since: fiveSecondsAgo });

      fetch(`/api/products/events?${params}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.events?.length > 0) {
            setEvents((prev) => [
              ...data.events,
              ...prev.filter((e) => !data.events.find((ne: any) => ne.id === e.id)),
            ]);
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [since]);

  return { events, loading };
}
