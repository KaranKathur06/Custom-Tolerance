"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquare, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type InquirySource = "profile" | "listing" | "search" | "capability";

type SendInquiryModalProps = {
  supplierId: string;
  supplierName: string;
  source?: InquirySource;
  listingId?: string;
  open: boolean;
  onClose: () => void;
};

export function SendInquiryModal({
  supplierId,
  supplierName,
  source = "profile",
  listingId,
  open,
  onClose,
}: SendInquiryModalProps) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState("");
  const [timeline, setTimeline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please describe your requirement.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/inquiries/supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId,
          listing_id: listingId ?? null,
          source,
          subject: subject.trim() || `Inquiry for ${supplierName}`,
          message: message.trim(),
          quantity: quantity.trim() || null,
          timeline: timeline.trim() || null,
        }),
      });

      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to send inquiry.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSubject("");
        setMessage("");
        setQuantity("");
        setTimeline("");
        setSuccess(false);
      }, 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inquiry-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h2 id="inquiry-modal-title" className="text-lg font-bold text-slate-900">
              Send Inquiry
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <MessageSquare className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="font-semibold text-slate-900">Inquiry sent successfully!</p>
            <p className="mt-1 text-sm text-slate-500">
              {supplierName} will be notified via WhatsApp and email.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            <p className="text-sm text-slate-600">
              Send a direct inquiry to <strong>{supplierName}</strong>. Include your
              requirement details for a faster response.
            </p>

            <div>
              <Label htmlFor="inquiry-subject">Subject</Label>
              <Input
                id="inquiry-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={`Inquiry for ${supplierName}`}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="inquiry-message">
                Requirement details <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="inquiry-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe material, process, quantity, and specifications…"
                rows={4}
                required
                className="mt-1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="inquiry-quantity">Quantity</Label>
                <Input
                  id="inquiry-quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 500 kg"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="inquiry-timeline">Timeline</Label>
                <Input
                  id="inquiry-timeline"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  placeholder="e.g. Within 2 weeks"
                  className="mt-1"
                />
              </div>
            </div>

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Inquiry"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

type SendInquiryButtonProps = {
  supplierId: string;
  supplierName: string;
  source?: InquirySource;
  listingId?: string;
  className?: string;
};

export function SendInquiryButton({
  supplierId,
  supplierName,
  source = "profile",
  listingId,
  className,
}: SendInquiryButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="mr-2 h-4 w-4" />
        Send Inquiry
      </Button>
      <SendInquiryModal
        supplierId={supplierId}
        supplierName={supplierName}
        source={source}
        listingId={listingId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
