"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GstRow = {
  id: string;
  gstin: string;
  legal_name: string | null;
  gst_state: string | null;
  status: string;
  verified_at: string;
  next_revalidation_at: string | null;
  suppliers: {
    id: string;
    company_name: string;
    slug: string;
    state: string;
    gst_verified_at: string | null;
  } | Array<{
    id: string;
    company_name: string;
    slug: string;
    state: string;
    gst_verified_at: string | null;
  }> | null;
};

type SupplierOption = {
  id: string;
  company_name: string;
  slug: string;
  state: string;
  gstin: string | null;
};

export function GstVerificationPanel() {
  const [verifications, setVerifications] = useState<GstRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [gstApiEnabled, setGstApiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [gstin, setGstin] = useState("");
  const [legalName, setLegalName] = useState("");
  const [gstState, setGstState] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gstRes, supplierRes] = await Promise.all([
        fetch("/api/admin/gst/revalidate", { credentials: "include" }),
        fetch("/api/admin/suppliers?limit=100", { credentials: "include" }),
      ]);
      const gstJson = await gstRes.json();
      const supplierJson = await supplierRes.json();
      if (gstJson.success) {
        setVerifications(gstJson.data ?? []);
        setGstApiEnabled(Boolean(gstJson.gstApiEnabled));
      }
      if (supplierJson.success) {
        setSuppliers(
          (supplierJson.data ?? []).map((s: Record<string, unknown>) => ({
            id: s.id as string,
            company_name: s.company_name as string,
            slug: (s.slug as string) ?? (s.id as string),
            state: (s.state as string) ?? "",
            gstin: (s.gstin as string) ?? null,
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function verifyGst() {
    if (!supplierId || !gstin.trim()) return;
    if (!gstApiEnabled && !legalName.trim()) {
      setMessage("Enter legal name for manual verification");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        supplier_id: supplierId,
        gstin: gstin.trim(),
      };
      if (!gstApiEnabled) {
        payload.manual = true;
        payload.legal_name = legalName.trim();
        if (gstState.trim()) payload.gst_state = gstState.trim();
      }

      const res = await fetch("/api/admin/gst/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error?.message ?? "Verification failed");
        return;
      }
      setMessage(`Verified: ${json.data?.lookup?.legalName ?? gstin}`);
      setGstin("");
      setLegalName("");
      void load();
    } finally {
      setSubmitting(false);
    }
  }

  async function runRevalidation() {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/gst/revalidate", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error?.message ?? "Revalidation failed");
        return;
      }
      setMessage(`Revalidated ${json.data?.processed ?? 0} records`);
      void load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {!gstApiEnabled ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">GST API not connected</p>
            <p className="mt-1">
              Live GST lookups are disabled. Use manual verification below (legal name required), or
              add <code>GST_API_KEY</code> and set <code>NEXT_PUBLIC_ENABLE_GST_API=true</code> when
              ready.
            </p>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Verify GSTIN
          </CardTitle>
          <CardDescription>Lookup legal name and lock verification snapshot on supplier profile.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Supplier</Label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name} ({s.state})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>GSTIN</Label>
            <Input
              className="mt-1 uppercase"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
            />
          </div>
          {!gstApiEnabled ? (
            <>
              <div>
                <Label>Legal name (manual)</Label>
                <Input
                  className="mt-1"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Registered business name"
                />
              </div>
              <div>
                <Label>GST state (optional)</Label>
                <Input
                  className="mt-1"
                  value={gstState}
                  onChange={(e) => setGstState(e.target.value)}
                  placeholder="Maharashtra"
                />
              </div>
            </>
          ) : null}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button onClick={verifyGst} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {gstApiEnabled ? "Verify GST" : "Record manual verification"}
            </Button>
            <Button variant="outline" onClick={runRevalidation} disabled={submitting || !gstApiEnabled}>
              Run quarterly revalidation
            </Button>
          </div>
          {message ? <p className="text-sm text-slate-600 md:col-span-2">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : verifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No GST verifications on file.</p>
          ) : (
            <div className="space-y-3">
              {verifications.map((row) => {
                const supplier = Array.isArray(row.suppliers) ? row.suppliers[0] : row.suppliers;
                return (
                  <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <p className="font-semibold">{supplier?.company_name ?? row.legal_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.gstin} · {row.gst_state ?? "—"}
                      </p>
                      <div className="mt-1 flex gap-2">
                        <Badge variant={row.status === "active" ? "success" : "secondary"}>
                          {row.status}
                        </Badge>
                        {supplier?.gst_verified_at ? (
                          <Badge variant="outline">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Badge active
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    {supplier?.slug ? (
                      <Link href={`/suppliers/${supplier.slug}`} className="text-sm text-blue-600 hover:underline">
                        View profile
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
