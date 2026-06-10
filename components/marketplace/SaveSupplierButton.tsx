"use client";

import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type SaveSupplierButtonProps = {
  supplierId: string;
  initialSaved?: boolean;
  variant?: "default" | "outline" | "ghost";
  className?: string;
};

export function SaveSupplierButton({
  supplierId,
  initialSaved = false,
  variant = "outline",
  className,
}: SaveSupplierButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggleSave() {
    setLoading(true);
    try {
      if (saved) {
        const res = await fetch(`/api/suppliers/saved?supplier_id=${supplierId}`, {
          method: "DELETE",
        });
        if (res.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        const json = await res.json();
        if (json.success) setSaved(false);
      } else {
        const res = await fetch("/api/suppliers/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplier_id: supplierId }),
        });
        if (res.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        const json = await res.json();
        if (json.success) setSaved(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={toggleSave}
      disabled={loading}
      aria-pressed={saved}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Heart
          className={`mr-2 h-4 w-4 ${saved ? "fill-red-500 text-red-500" : ""}`}
        />
      )}
      {saved ? "Saved" : "Save Supplier"}
    </Button>
  );
}
