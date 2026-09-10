import { formatLeadTime as formatProductLeadTime, formatPrecision as formatProductPrecision } from "@/lib/product/display";

export function formatLeadTime(value: unknown): string {
  return formatProductLeadTime(value, "Not specified");
}

export function formatPrecision(value: unknown): string {
  return formatProductPrecision(value, "Not specified");
}

export function formatProductStatus(product: {
  lifecycle_status?: unknown;
  approval_status?: unknown;
  is_visible?: unknown;
  lifecycleStatus?: unknown;
  approvalStatus?: unknown;
  isVisible?: unknown;
}): { label: string; tone: "neutral" | "warning" | "success" | "danger" } {
  const lifecycle = String(product.lifecycle_status ?? product.lifecycleStatus ?? product.approval_status ?? product.approvalStatus ?? "draft");
  if (lifecycle === "pending_review") return { label: "Pending Review", tone: "warning" };
  if (lifecycle === "rejected") return { label: "Changes Required", tone: "danger" };
  if (lifecycle === "active") {
    return (product.is_visible ?? product.isVisible) === false
      ? { label: "Hidden", tone: "neutral" }
      : { label: "Live", tone: "success" };
  }
  if (lifecycle === "paused") return { label: "Paused", tone: "neutral" };
  if (lifecycle === "archived") return { label: "Archived", tone: "neutral" };
  return { label: "Draft", tone: "neutral" };
}
