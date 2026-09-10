import { formatLeadTime as formatProductLeadTime, formatPrecision as formatProductPrecision } from "@/lib/product/display";

const isPresent = (value: unknown): value is string | number =>
  value !== null && value !== undefined && value !== "" && !(typeof value === "number" && !Number.isFinite(value));

export function formatTolerance(value: unknown): string | undefined {
  if (!isPresent(value)) return undefined;
  return formatProductPrecision(value);
}

export function formatLeadTime(value: unknown): string | undefined {
  if (!isPresent(value)) return undefined;
  return formatProductLeadTime(value);
}

export function formatQuantity(value: unknown, unit?: unknown): string | undefined {
  if (!isPresent(value)) return undefined;
  return [String(value), isPresent(unit) ? String(unit) : undefined].filter(Boolean).join(" ");
}

export function formatCurrency(value: unknown, currency?: unknown, unit?: unknown): string | undefined {
  if (!isPresent(value)) return undefined;
  return [isPresent(currency) ? String(currency) : undefined, String(value), isPresent(unit) ? `/ ${String(unit)}` : undefined].filter(Boolean).join(" ");
}

export function formatDimensions(length: unknown, width: unknown, height: unknown, unit?: unknown): string | undefined {
  const values = [length, width, height].filter(isPresent).map(String);
  return values.length ? `${values.join(" × ")}${isPresent(unit) ? ` ${String(unit)}` : ""}` : undefined;
}
