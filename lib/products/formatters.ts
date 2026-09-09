export function formatLeadTime(value: unknown): string {
  if (value == null || value === "") return "Not specified";
  const text = String(value).trim();
  const range = text.match(/^([0-9]+)_([0-9]+)_weeks?$/i);
  if (range) return `${range[1]}-${range[2]} weeks`;
  return text.replace(/_/g, " ");
}

export function formatPrecision(value: unknown): string {
  if (value == null || value === "") return "Not specified";
  const text = String(value).trim();
  const encoded = text.match(/^precision_([0-9]+)_([0-9]+)$/i);
  if (encoded) return `${encoded[1]}.${encoded[2]}`;
  return text.replace(/_/g, " ");
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
