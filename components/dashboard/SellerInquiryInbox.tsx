"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type InquiryRow = {
  id: string;
  subject: string | null;
  message: string;
  quantity: string | null;
  timeline: string | null;
  source: string;
  status: string;
  is_read: boolean;
  created_at: string;
};

const SOURCE_LABELS: Record<string, string> = {
  profile: "Profile",
  listing: "Listing",
  search: "Search",
  capability: "Capability",
};

export function SellerInquiryInbox() {
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter === "unread" ? "?unread=true" : "";
      const res = await fetch(`/api/dashboard/seller/inquiries${qs}`);
      const json = await res.json();
      if (json.success) setInquiries(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    await fetch("/api/dashboard/seller/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inquiry_id: id }),
    });
    void load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          Unread
        </Button>
      </div>

      {!inquiries.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No inquiries yet. A complete profile improves inbound leads.
        </p>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => (
            <div
              key={inq.id}
              className={`rounded-lg border p-4 ${inq.is_read ? "bg-white" : "border-blue-100 bg-blue-50/40"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <h3 className="font-semibold">{inq.subject ?? "Buyer inquiry"}</h3>
                    {!inq.is_read ? <Badge>New</Badge> : null}
                    <Badge variant="outline">
                      {SOURCE_LABELS[inq.source] ?? inq.source}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{inq.message}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {inq.quantity ? <span>Qty: {inq.quantity}</span> : null}
                    {inq.timeline ? <span>Timeline: {inq.timeline}</span> : null}
                    <span>{new Date(inq.created_at).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                {!inq.is_read ? (
                  <Button variant="outline" size="sm" onClick={() => markRead(inq.id)}>
                    Mark read
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
