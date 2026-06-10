"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type RfqRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  city: string | null;
  state: string | null;
  material_grade: string | null;
  manufacturing_process: string | null;
  created_at: string;
  quotes?: Array<{ count: number }>;
};

export function AdminRfqModeration() {
  const [rfqs, setRfqs] = useState<RfqRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rfqs?limit=30", { credentials: "include" });
      const json = await res.json();
      if (json.success) setRfqs(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(rfqId: string, actionName: string, extra?: Record<string, string>) {
    await fetch("/api/admin/rfqs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ rfq_id: rfqId, action: actionName, ...extra }),
    });
    void load();
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : rfqs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No RFQs to moderate.</p>
      ) : (
        <div className="space-y-3">
          {rfqs.map((rfq) => {
            const quoteCount = rfq.quotes?.[0]?.count ?? 0;
            return (
              <div key={rfq.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/rfq/${rfq.slug}`} className="font-semibold hover:text-primary">
                      {rfq.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {[rfq.city, rfq.state].filter(Boolean).join(", ")} · {quoteCount} quotes
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="outline">{rfq.status}</Badge>
                      {rfq.manufacturing_process ? (
                        <Badge variant="secondary">{rfq.manufacturing_process}</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => action(rfq.id, "flag")}>
                      Flag
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => action(rfq.id, "close")}>
                      Close
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => action(rfq.id, "cancel")}>
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Input
                    placeholder="Fix material grade"
                    className="h-8 max-w-[180px] text-xs"
                    defaultValue={rfq.material_grade ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (rfq.material_grade ?? "")) {
                        void action(rfq.id, "update_category", { material_grade: e.target.value });
                      }
                    }}
                  />
                  <Input
                    placeholder="Fix process"
                    className="h-8 max-w-[180px] text-xs"
                    defaultValue={rfq.manufacturing_process ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (rfq.manufacturing_process ?? "")) {
                        void action(rfq.id, "update_category", {
                          manufacturing_process: e.target.value,
                        });
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
