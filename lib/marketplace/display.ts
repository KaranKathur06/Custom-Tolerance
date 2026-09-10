import { formatCapability as formatProductCapability, formatDisplayValue, formatLeadTime as formatProductLeadTime } from "@/lib/product/display";

export const formatCapability = formatProductCapability;

export function formatMarketplaceValue(value: unknown, fallback = "Not provided") {
  if (typeof value === "number" && Number.isFinite(value)) return value.toLocaleString();
  return formatDisplayValue(value, fallback);
}

export function formatLeadTime(value: unknown) {
  return formatProductLeadTime(value);
}

export function formatPrice(value: unknown, currency = "USD") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Price on Request";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}