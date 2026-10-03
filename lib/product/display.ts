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
  advance_50_balance_50: "50% Advance, 50% Before Shipment",
  advance_30_balance_70: "30% Advance, 70% Against Documents",
  lc_at_sight: "LC at Sight",
  lc_90_days: "LC 90 Days",
  tt_30_days: "T/T 30 Days",
  tt_60_days: "T/T 60 Days",
  tt_90_days: "T/T 90 Days",
  net_30: "Net 30",
  net_60: "Net 60",
  da: "D/A — Documents Against Acceptance",
  dp: "D/P — Documents Against Payment",
  open_account: "Open Account",
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
  ex_works: "EXW — Ex Works",
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
  standard: "Standard Export Packaging",
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
  tt: "T/T",
  da: "D/A",
  dp: "D/P",
  asme: "ASME",
  aisi: "AISI",
  oem: "OEM",
  pvd: "PVD",
};

const UNIT_LABELS: Record<string, string> = {
  pcs: "pcs",
  sets: "sets",
  kg: "kg",
  ton: "MT",
  meters: "m",
  sq_meters: "m²",
  liters: "L",
  boxes: "boxes",
  rolls: "rolls",
  pairs: "pairs",
  mg: "mg",
  g: "g",
  lb: "lb",
  mm: "mm",
  cm: "cm",
  inch: "in",
  meter: "m",
};

const FIELD_LABELS: Record<string, string> = {
  countryOrigin: "Country of Origin",
  businessNature: "Business Nature",
  gstNumber: "GST Number",
  gstVerified: "GST Verification",
  legalBusinessName: "Legal Business Name",
  addressLine1: "Address Line 1",
  city: "City",
  state: "State",
  postalCode: "Postal Code",
  verificationType: "Verification Type",
  dunsNumber: "DUNS Number",
  companyRegistrationNumber: "Company Registration Number",
  contactPersonName: "Contact Person",
  designation: "Designation",
  mobileNumber: "Mobile Number",
  mobileVerified: "Mobile Verification",
  businessEmail: "Business Email",
  emailVerified: "Email Verification",
  sellerTypes: "Seller Type",
  sellerTypeOther: "Seller Type (Other)",
  industriesServed: "Industries Served",
  capabilities: "Capabilities",
  buyerServices: "Buyer Services",
  supplierInterests: "Supplier Interests",
  yearsInBusiness: "Years in Business",
  videoUrls: "Factory Video URLs",
  capabilityCategories: "Capability Categories",
  products: "Products",
  bankName: "Bank Name",
  accountHolderName: "Account Holder Name",
  accountNumber: "Account Number",
  confirmAccountNumber: "Confirm Account Number",
  ifscCode: "IFSC Code",
  branchName: "Branch Name",
  cancelledChequeDocumentId: "Cancelled Cheque",
  sellerAgreement: "Seller Agreement",
  termsAccepted: "Terms & Conditions",
  privacyAccepted: "Privacy Policy",
  kycConsent: "KYC Consent",
  companyDescription: "Company Description",
  factoryPhotos: "Factory Photos",
  machines: "Machines",
  certifications: "Certifications",
  exportExperience: "Export Experience",
  factoryTourUrl: "Factory Tour URL",
  factoryTourVideoId: "Factory Tour Video",
  product_name: "Product Name",
  industries_served: "Industries Served",
  product_standard: "Product Standard",
  quality_certificate: "Quality Certificate",
  tolerance: "Tolerance",
  tolerance_capability: "Tolerance Capability",
  product_weight: "Product Weight",
  minimum_order: "Minimum Order Quantity",
  minimum_order_quantity: "Minimum Order Quantity",
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
  shipping_type: "Shipping Type",
  primary_packaging: "Primary Packaging",
  secondary_packaging: "Secondary Packaging",
  incoterms: "Incoterms",
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
    .map((word) => {
      const parts = word.match(/^([^a-z0-9]*)([a-z0-9]+)([^a-z0-9]*)$/i);
      if (!parts) return word;
      const [, prefix, token, suffix] = parts;
      const label = ACRONYM_LABELS[token.toLowerCase()] ?? `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`;
      return `${prefix}${label}${suffix}`;
    })
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
  if (!isPresent(value)) return fallback;
  if (typeof value !== "string") return formatEnumLabel(value, fallback);
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/i.test(normalized)) return value.trim();
  if (normalized === "custom") return "Custom";
  const range = normalized.match(/^(\d+)_(\d+)_(weeks?|months?)$/);
  if (range) {
    const unit = range[3].startsWith("week") ? "Weeks" : "Months";
    return `${range[1]}–${range[2]} ${unit}`;
  }
  const single = normalized.match(/^(\d+)_(weeks?|months?)$/);
  if (single) {
    const unit = single[2].startsWith("week") ? "Week" : "Month";
    return `${single[1]} ${Number(single[1]) === 1 ? unit : `${unit}s`}`;
  }
  return formatEnumLabel(normalized, fallback);
}

export function formatPackaging(value: unknown): string {
  if (typeof value === "string" && value.trim().toLowerCase() === "custom") return "Custom Packaging";
  return formatEnumLabel(value);
}

export const formatPackagingType = formatPackaging;

export function formatShippingType(value: unknown): string {
  return formatEnumLabel(value);
}

export function formatIncoterm(value: unknown): string {
  return formatEnumLabel(value);
}

export function formatIncoterms(value: unknown): string[] {
  if (Array.isArray(value)) return formatList(value, formatIncoterm);
  if (typeof value !== "string" || !value.trim()) return [];
  return value.split(",").map((term) => formatIncoterm(term.trim())).filter((term) => term !== "Not provided");
}

export function formatPaymentTerm(value: unknown): string {
  if (typeof value !== "string") return formatEnumLabel(value);
  const normalized = value.trim();
  if (!normalized) return "Not provided";
  if (DOMAIN_LABELS[normalized] || ACRONYM_LABELS[normalized.toLowerCase()] || /^[a-z0-9]+(?:[_-][a-z0-9]+)+$/i.test(normalized)) {
    return formatEnumLabel(normalized);
  }
  return normalized;
}

export function formatPaymentTerms(value: unknown): string[] {
  if (Array.isArray(value)) return formatList(value, formatPaymentTerm);
  if (typeof value !== "string" || !value.trim()) return [];
  const terms = value.split(",").map((term) => term.trim()).filter(Boolean);
  if (terms.length > 1 && terms.every((term) =>
    DOMAIN_LABELS[term] || ACRONYM_LABELS[term.toLowerCase()] || /^[a-z0-9]+(?:[_-][a-z0-9]+)+$/i.test(term)
  )) {
    return terms.map(formatPaymentTerm);
  }
  return [formatPaymentTerm(value)];
}

export function formatPriceType(value: unknown): string {
  return formatEnumLabel(value);
}

export function formatPriceUnit(value: unknown): string {
  return formatEnumLabel(value);
}

export function formatUnit(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "Not provided";
  const normalized = value.trim();
  return UNIT_LABELS[normalized.toLowerCase()] ?? formatEnumLabel(normalized);
}

export function formatBoolean(value: unknown, trueLabel = "Yes", falseLabel = "No", fallback = "Not provided"): string {
  if (value === true) return trueLabel;
  if (value === false) return falseLabel;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "yes") return trueLabel;
    if (normalized === "false" || normalized === "no") return falseLabel;
  }
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
  if (Array.isArray(value)) {
    const items = value.filter(isPresent).map((item) => String(item));
    return items.join(", ") || fallback;
  }
  return typeof value === "string" ? value : String(value);
}

export function formatSpecification(value: unknown, fallback = "Not provided"): string {
  if (!isPresent(value)) return fallback;
  if (typeof value !== "string") return String(value);
  const normalized = value.trim();
  if (!normalized) return fallback;
  if (/^[a-z0-9]+(?:[_-][a-z0-9]+)*(?:\s*,\s*[a-z0-9]+(?:[_-][a-z0-9]+)*)+$/i.test(normalized)) {
    return normalized.split(",").map((part) => formatEnumLabel(part.trim())).join(", ");
  }
  if (DOMAIN_LABELS[normalized] || /^[a-z0-9]+(?:[_-][a-z0-9]+)+$/i.test(normalized)) {
    return formatEnumLabel(normalized, fallback);
  }
  return normalized;
}

export function formatPrecision(value: unknown, fallback = "Not provided"): string {
  if (typeof value === "string" && value.trim().toLowerCase() === "custom") {
    return "Custom Tolerance (specify on RFQ)";
  }
  return formatEnumLabel(value, fallback);
}
