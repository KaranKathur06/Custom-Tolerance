const DOMAIN_LABELS: Record<string, string> = {
  ask_for_price: "Request a Quote",
  fixed_price: "Fixed Price",
  price_range: "Price Range",
  negotiable: "Negotiable",
  per_piece: "Per Piece",
  per_unit: "Per Unit",
  per_kg: "Per Kilogram",
  per_ton: "Per Ton",
  per_meter: "Per Meter",
  per_set: "Per Set",
  per_lot: "Per Lot",
  per_sq_meter: "Per Square Meter",
  per_liter: "Per Liter",
  advance_100: "100% Advance",
  advance_50_balance_50: "50% Advance, 50% Balance",
  advance_30_balance_70: "30% Advance, 70% Balance",
  precision_0_01: "Precision (±0.01 mm)",
  ultra_0_005: "Ultra Precision (±0.005 mm)",
  ultra_0_001: "Micron Level (±0.001 mm)",
  iso_2768_c: "Coarse (ISO 2768-c)",
  iso_2768_m: "Medium/Standard (ISO 2768-m)",
  iso_2768_f: "Fine (ISO 2768-f)",
  iso_2768_v: "Very Fine (ISO 2768-v)",
  it6: "IT6 (±0.013 mm)",
  it7: "IT7 (±0.021 mm)",
  it8: "IT8 (±0.033 mm)",
  din_16901: "DIN 16901 (Injection Moulding)",
  asme_b4_1: "ASME B4.1 (US Fits & Tolerances)",
  custom: "Custom Tolerance (specify on RFQ)",
  not_required: "Not Required",
  required: "Required",
  available: "Available",
  unavailable: "Unavailable",
  in_stock: "In Stock",
  lt_1_week: "Less than 1 Week",
  "1_2_weeks": "1–2 Weeks",
  "2_4_weeks": "2–4 Weeks",
  "1_2_months": "1–2 Months",
  "2_3_months": "2–3 Months",
  gt_3_months: "More than 3 Months",
  loose: "Loose",
  packed: "Packed",
  bulk: "Bulk",
  containerized: "Containerized",
  none: "None",
  poly_wrap: "Poly Wrap",
  bubble_wrap: "Bubble Wrap",
  thermocol: "Thermocol",
  vci: "VCI Packaging (Anti-Rust)",
  corrugated_box: "Corrugated Box",
  wooden_box: "Wooden Box",
  wooden_crate: "Wooden Crate",
  export_crate: "Export Crate",
  pallet: "Pallet",
  vacuum_pack: "Vacuum Packaging",
  automotive: "Automotive",
  two_wheeler: "Two-Wheeler",
  commercial_vehicle: "Commercial Vehicle",
  ev: "Electric Vehicles",
  cnc: "CNC",
  cnc_turning: "CNC Turning",
  cnc_milling: "CNC Milling",
  cnc_grinding: "CNC Grinding",
  honing: "Honing",
  boring: "Boring",
  broaching: "Broaching",
  tapping: "Tapping",
  laser_cutting: "Laser Cutting",
  plasma_cutting: "Plasma Cutting",
  waterjet: "Waterjet Cutting",
  sheet_metal: "Sheet Metal",
  welding: "Welding",
  bending: "Bending",
  punching: "Punching",
  stamping_fab: "Stamping & Fabrication",
  hot_forging: "Hot Forging",
  cold_forging: "Cold Forging",
  drop_forging: "Drop Forging",
  die_casting: "Die Casting",
  sand_casting: "Sand Casting",
};

const ACRONYM_LABELS: Record<string, string> = {
  cnc: "CNC",
  iso: "ISO",
  astm: "ASTM",
  din: "DIN",
  iatf: "IATF",
  gst: "GST",
  msme: "MSME",
  url: "URL",
  ev: "EV",
  fca: "FCA",
  fas: "FAS",
  fob: "FOB",
  exw: "EXW",
  cfr: "CFR",
  cif: "CIF",
  cpt: "CPT",
  cip: "CIP",
  dat: "DAT",
  dap: "DAP",
  ddp: "DDP",
  vci: "VCI",
};

const FIELD_LABELS: Record<string, string> = {
  product_name: "Product Name",
  capabilities: "Capabilities",
  industries_served: "Industries Served",
  product_standard: "Product Standard",
  quality_certificate: "Quality Certificate",
  tolerance: "Tolerance",
  tolerance_capability: "Tolerance Capability",
  product_weight: "Product Weight",
  minimum_order: "Minimum Order Quantity",
  moq: "Minimum Order Quantity",
  dies_and_tools: "Dies & Tools",
  price_type: "Pricing Model",
  min_price: "Minimum Price",
  max_price: "Maximum Price",
  price_unit: "Price Unit",
  monthly_capacity: "Monthly Production Capacity",
  lead_time: "Lead Time",
  payment_terms: "Payment Terms",
  free_sample: "Free Sample",
  sample_shipping_cost: "Sample Shipping Cost",
  third_party_inspection: "Third-Party Inspection",
};

const isPresent = (value: unknown): value is string | number | boolean =>
  value !== null && value !== undefined && value !== "";

function humanize(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => ACRONYM_LABELS[word.toLowerCase()] ?? `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

export function formatEnumLabel(value: unknown, fallback = "Not provided"): string {
  if (!isPresent(value)) return fallback;
  if (typeof value !== "string") return String(value);
  const normalized = value.trim();
  if (!normalized) return fallback;
  return DOMAIN_LABELS[normalized] ?? ACRONYM_LABELS[normalized.toLowerCase()] ?? humanize(normalized);
}

export function formatList(values: unknown, formatter: (value: unknown) => string = formatEnumLabel): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter(isPresent).map(formatter);
}

export function formatCapability(value: unknown): string {
  return formatEnumLabel(value);
}

export function formatIndustry(value: unknown): string {
  return formatEnumLabel(value);
}

export function formatMaterial(value: unknown): string {
  return isPresent(value) ? String(value) : "Not provided";
}

export function formatGrade(value: unknown): string {
  return isPresent(value) ? String(value) : "Not provided";
}

export function formatLeadTime(value: unknown, fallback = "Not provided"): string {
  return formatEnumLabel(value, fallback);
}

export function formatPackaging(value: unknown): string {
  return formatEnumLabel(value);
}

export function formatShippingType(value: unknown): string {
  return formatEnumLabel(value);
}

export function formatIncoterm(value: unknown): string {
  return formatEnumLabel(value);
}

export function formatPaymentTerm(value: unknown): string {
  return formatEnumLabel(value);
}

export function formatPriceType(value: unknown): string {
  return formatEnumLabel(value);
}

export function formatPriceUnit(value: unknown): string {
  return formatEnumLabel(value);
}

export function formatBoolean(value: unknown, trueLabel = "Yes", falseLabel = "No", fallback = "Not provided"): string {
  if (value === true || value === "true" || value === "yes") return trueLabel;
  if (value === false || value === "false" || value === "no") return falseLabel;
  return fallback;
}

export function formatBooleanField(value: unknown, field: "availability" | "default" = "default"): string {
  return field === "availability"
    ? formatBoolean(value, "Available", "Not Available")
    : formatBoolean(value);
}

export function formatFieldLabel(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  return FIELD_LABELS[value.trim()] ?? humanize(value);
}

export function formatDisplayValue(value: unknown, fallback = "Not provided"): string {
  if (!isPresent(value)) return fallback;
  if (Array.isArray(value)) return formatList(value).join(", ") || fallback;
  return typeof value === "string" ? value : String(value);
}

export function formatPrecision(value: unknown, fallback = "Not provided"): string {
  return formatEnumLabel(value, fallback);
}
