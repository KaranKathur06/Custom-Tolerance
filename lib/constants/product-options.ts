// ============================================================
// PRODUCT OPTIONS — Full Manufacturing B2B Dataset
// CustomTolerance PIM System
// ============================================================

// ── Countries ─────────────────────────────────────────────
export const COUNTRIES = [
  { id: "in", name: "India" },
  { id: "cn", name: "China" },
  { id: "us", name: "United States" },
  { id: "de", name: "Germany" },
  { id: "jp", name: "Japan" },
  { id: "kr", name: "South Korea" },
  { id: "tw", name: "Taiwan" },
  { id: "gb", name: "United Kingdom" },
  { id: "fr", name: "France" },
  { id: "it", name: "Italy" },
  { id: "mx", name: "Mexico" },
  { id: "br", name: "Brazil" },
  { id: "ca", name: "Canada" },
  { id: "au", name: "Australia" },
  { id: "sg", name: "Singapore" },
  { id: "my", name: "Malaysia" },
  { id: "th", name: "Thailand" },
  { id: "vn", name: "Vietnam" },
  { id: "id", name: "Indonesia" },
  { id: "pk", name: "Pakistan" },
  { id: "bd", name: "Bangladesh" },
  { id: "lk", name: "Sri Lanka" },
  { id: "ae", name: "United Arab Emirates" },
  { id: "sa", name: "Saudi Arabia" },
  { id: "za", name: "South Africa" },
  { id: "eg", name: "Egypt" },
  { id: "tr", name: "Turkey" },
  { id: "pl", name: "Poland" },
  { id: "es", name: "Spain" },
  { id: "nl", name: "Netherlands" },
  { id: "se", name: "Sweden" },
  { id: "ch", name: "Switzerland" },
  { id: "at", name: "Austria" },
  { id: "cz", name: "Czech Republic" },
  { id: "hu", name: "Hungary" },
  { id: "ro", name: "Romania" },
  { id: "ua", name: "Ukraine" },
  { id: "ru", name: "Russia" },
  { id: "ar", name: "Argentina" },
  { id: "cl", name: "Chile" },
  { id: "co", name: "Colombia" },
  { id: "ph", name: "Philippines" },
  { id: "np", name: "Nepal" },
];

// ── Currencies ────────────────────────────────────────────
export const CURRENCIES = [
  { id: "USD", name: "USD — US Dollar" },
  { id: "INR", name: "INR — Indian Rupee" },
  { id: "EUR", name: "EUR — Euro" },
  { id: "GBP", name: "GBP — British Pound" },
  { id: "JPY", name: "JPY — Japanese Yen" },
  { id: "CNY", name: "CNY — Chinese Yuan" },
  { id: "AUD", name: "AUD — Australian Dollar" },
  { id: "CAD", name: "CAD — Canadian Dollar" },
  { id: "SGD", name: "SGD — Singapore Dollar" },
  { id: "AED", name: "AED — UAE Dirham" },
];

// ── Price Units ───────────────────────────────────────────
export const PRICE_UNITS = [
  { id: "per_piece", name: "Per Piece" },
  { id: "per_kg", name: "Per Kg" },
  { id: "per_ton", name: "Per Ton" },
  { id: "per_meter", name: "Per Meter" },
  { id: "per_set", name: "Per Set" },
  { id: "per_unit", name: "Per Unit" },
  { id: "per_lot", name: "Per Lot" },
  { id: "per_sq_meter", name: "Per Sq. Meter" },
  { id: "per_liter", name: "Per Liter" },
];

// ── Capacity / MOQ Units ──────────────────────────────────
export const UNITS = [
  { id: "pcs", name: "Pieces (pcs)" },
  { id: "sets", name: "Sets" },
  { id: "kg", name: "Kilograms (kg)" },
  { id: "ton", name: "Tons (MT)" },
  { id: "meters", name: "Meters (m)" },
  { id: "sq_meters", name: "Square Meters (m²)" },
  { id: "liters", name: "Liters (L)" },
  { id: "boxes", name: "Boxes" },
  { id: "rolls", name: "Rolls" },
  { id: "pairs", name: "Pairs" },
];

// ── Weight Units ──────────────────────────────────────────
export const WEIGHT_UNITS = [
  { id: "mg", name: "Milligrams (mg)" },
  { id: "g", name: "Grams (g)" },
  { id: "kg", name: "Kilograms (kg)" },
  { id: "lb", name: "Pounds (lb)" },
  { id: "ton", name: "Metric Tons (MT)" },
];

// ── Dimension Units ───────────────────────────────────────
export const DIMENSION_UNITS = [
  { id: "mm", name: "Millimeters (mm)" },
  { id: "cm", name: "Centimeters (cm)" },
  { id: "inch", name: "Inches (in)" },
  { id: "meter", name: "Meters (m)" },
];

// ── Lead Times ────────────────────────────────────────────
export const LEAD_TIMES = [
  { id: "in_stock", name: "In Stock" },
  { id: "lt_1_week", name: "Less than 1 Week" },
  { id: "1_2_weeks", name: "1–2 Weeks" },
  { id: "2_4_weeks", name: "2–4 Weeks" },
  { id: "1_2_months", name: "1–2 Months" },
  { id: "2_3_months", name: "2–3 Months" },
  { id: "gt_3_months", name: "More than 3 Months" },
];

// ── Tolerances ────────────────────────────────────────────
export const TOLERANCES = [
  { id: "iso_2768_c", name: "Coarse (ISO 2768-c)" },
  { id: "iso_2768_m", name: "Medium/Standard (ISO 2768-m)" },
  { id: "iso_2768_f", name: "Fine (ISO 2768-f)" },
  { id: "iso_2768_v", name: "Very Fine (ISO 2768-v)" },
  { id: "it6", name: "IT6 (±0.013 mm)" },
  { id: "it7", name: "IT7 (±0.021 mm)" },
  { id: "it8", name: "IT8 (±0.033 mm)" },
  { id: "precision_0_01", name: "Precision (±0.01 mm)" },
  { id: "ultra_0_005", name: "Ultra Precision (±0.005 mm)" },
  { id: "ultra_0_001", name: "Micron Level (±0.001 mm)" },
  { id: "din_16901", name: "DIN 16901 (Injection Moulding)" },
  { id: "asme_b4_1", name: "ASME B4.1 (US Fits & Tolerances)" },
  { id: "custom", name: "Custom Tolerance (specify on RFQ)" },
];

// ── Quality Certificates ──────────────────────────────────
export const QUALITY_CERTIFICATES = [
  { id: "yes", name: "Yes" },
  { id: "no", name: "No" },
  { id: "na", name: "N.A." },
];

// ── Brand Marking ─────────────────────────────────────────
export const BRAND_MARKING_OPTIONS = [
  { id: "laser_engraving", name: "Laser Engraving" },
  { id: "laser_annealing", name: "Laser Annealing" },
  { id: "stamping", name: "Stamping" },
  { id: "cnc_engraving", name: "CNC Engraving" },
  { id: "dot_peen", name: "Dot Peen Marking" },
  { id: "no_marking", name: "No Marking" },
  { id: "other", name: "Other" },
];

// ── Dies & Tooling ────────────────────────────────────────
export const DIES_AND_TOOLS_COST = [
  {
    id: "not_required",
    name: "No, all required dies/tools already available",
  },
  {
    id: "required",
    name: "Yes, new dies/tools are required",
  },
];

// ── Incoterms ─────────────────────────────────────────────
export const INCOTERMS = [
  { id: "ex_works", name: "EXW — Ex Works" },
  { id: "fca", name: "FCA — Free Carrier" },
  { id: "fas", name: "FAS — Free Alongside Ship" },
  { id: "fob", name: "FOB — Free on Board" },
  { id: "cfr", name: "CFR — Cost and Freight" },
  { id: "cif", name: "CIF — Cost, Insurance and Freight" },
  { id: "cpt", name: "CPT — Carriage Paid To" },
  { id: "cip", name: "CIP — Carriage and Insurance Paid To" },
  { id: "dat", name: "DAT — Delivered at Terminal" },
  { id: "dap", name: "DAP — Delivered at Place" },
  { id: "ddp", name: "DDP — Delivered Duty Paid" },
];

// ── Payment Terms ─────────────────────────────────────────
export const PAYMENT_TERMS = [
  { id: "advance_100", name: "100% Advance" },
  { id: "advance_50_balance_50", name: "50% Advance, 50% Before Shipment" },
  { id: "advance_30_balance_70", name: "30% Advance, 70% Against Documents" },
  { id: "lc_at_sight", name: "LC at Sight" },
  { id: "lc_90_days", name: "LC 90 Days" },
  { id: "tt_30_days", name: "T/T 30 Days" },
  { id: "tt_60_days", name: "T/T 60 Days" },
  { id: "tt_90_days", name: "T/T 90 Days" },
  { id: "net_30", name: "Net 30" },
  { id: "net_60", name: "Net 60" },
  { id: "da", name: "D/A — Documents Against Acceptance" },
  { id: "dp", name: "D/P — Documents Against Payment" },
  { id: "open_account", name: "Open Account" },
];

// ── Shipping Type ─────────────────────────────────────────
export const SHIPPING_TYPES = [
  { id: "loose", name: "Loose (Bulk)" },
  { id: "packed", name: "Packed" },
];

// ── Primary Packaging ─────────────────────────────────────
export const PRIMARY_PACKAGING = [
  { id: "none", name: "None" },
  { id: "poly_wrap", name: "Poly Plastic Wrap" },
  { id: "bubble_wrap", name: "Bubble Wrap" },
  { id: "thermocol", name: "Thermocol" },
  { id: "vci", name: "VCI Packaging (Anti-Rust)" },
  { id: "other", name: "Other" },
];

// ── Secondary Packaging ───────────────────────────────────
export const SECONDARY_PACKAGING = [
  { id: "none", name: "None" },
  { id: "corrugated_box", name: "Corrugated Box" },
  { id: "wooden_box", name: "Wooden Box" },
  { id: "export_crate", name: "Export Crate" },
  { id: "pallet", name: "Pallet" },
  { id: "other", name: "Other" },
];

// Legacy — kept for backward compat
export const PACKAGING_OPTIONS = [
  { id: "standard", name: "Standard Export Packaging" },
  { id: "wooden_crate", name: "Wooden Crates" },
  { id: "pallet", name: "Pallets" },
  { id: "custom", name: "Custom Packaging" },
];

// ── Grouped Capabilities ──────────────────────────────────
export type CapabilityGroup = {
  group: string;
  items: { id: string; name: string }[];
};

export const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    group: "Machining",
    items: [
      { id: "cnc_turning", name: "CNC Turning" },
      { id: "cnc_milling", name: "CNC Milling" },
      { id: "cnc_grinding", name: "CNC Grinding" },
      { id: "honing", name: "Honing" },
      { id: "boring", name: "Boring" },
      { id: "broaching", name: "Broaching" },
      { id: "tapping", name: "Tapping / Threading" },
    ],
  },
  {
    group: "Fabrication",
    items: [
      { id: "laser_cutting", name: "Laser Cutting" },
      { id: "plasma_cutting", name: "Plasma Cutting" },
      { id: "waterjet", name: "Waterjet Cutting" },
      { id: "sheet_metal", name: "Sheet Metal Fabrication" },
      { id: "welding", name: "Welding / MIG / TIG" },
      { id: "bending", name: "Bending / Press Brake" },
      { id: "punching", name: "Punching" },
      { id: "stamping_fab", name: "Metal Stamping" },
    ],
  },
  {
    group: "Casting",
    items: [
      { id: "die_casting", name: "Die Casting" },
      { id: "sand_casting", name: "Sand Casting" },
      { id: "investment_casting", name: "Investment Casting" },
      { id: "gravity_casting", name: "Gravity Casting" },
      { id: "pressure_die_casting", name: "Pressure Die Casting" },
    ],
  },
  {
    group: "Forging",
    items: [
      { id: "hot_forging", name: "Hot Forging" },
      { id: "cold_forging", name: "Cold Forging" },
      { id: "drop_forging", name: "Drop Forging" },
      { id: "ring_rolling", name: "Ring Rolling" },
    ],
  },
  {
    group: "Surface Treatment",
    items: [
      { id: "anodizing", name: "Anodizing" },
      { id: "electroplating", name: "Electroplating" },
      { id: "powder_coating", name: "Powder Coating" },
      { id: "zinc_plating", name: "Zinc Plating" },
      { id: "nickel_plating", name: "Nickel Plating" },
      { id: "chrome_plating", name: "Chrome Plating" },
      { id: "black_oxide", name: "Black Oxide" },
      { id: "passivation", name: "Passivation" },
      { id: "pvd_coating", name: "PVD Coating" },
      { id: "painting", name: "Painting / Liquid Coating" },
    ],
  },
  {
    group: "Heat Treatment",
    items: [
      { id: "hardening", name: "Hardening" },
      { id: "tempering", name: "Tempering" },
      { id: "annealing", name: "Annealing" },
      { id: "carburizing", name: "Carburizing" },
      { id: "nitriding", name: "Nitriding" },
      { id: "case_hardening", name: "Case Hardening" },
      { id: "induction_hardening", name: "Induction Hardening" },
    ],
  },
  {
    group: "Assembly",
    items: [
      { id: "mechanical_assembly", name: "Mechanical Assembly" },
      { id: "sub_assembly", name: "Sub-Assembly" },
      { id: "press_fit", name: "Press Fit Assembly" },
      { id: "bonding", name: "Adhesive Bonding" },
    ],
  },
  {
    group: "Additive / 3D Printing",
    items: [
      { id: "fdm", name: "FDM (Plastic)" },
      { id: "sla", name: "SLA (Resin)" },
      { id: "sls", name: "SLS (Nylon / Powder)" },
      { id: "metal_3d", name: "Metal 3D Printing (SLM/DMLS)" },
      { id: "mjf", name: "MJF (Multi-Jet Fusion)" },
    ],
  },
  {
    group: "Quality / Inspection",
    items: [
      { id: "cmm_inspection", name: "CMM Inspection" },
      { id: "ndt", name: "NDT (Non-Destructive Testing)" },
      { id: "fatigue_testing", name: "Fatigue Testing" },
      { id: "hardness_testing", name: "Hardness Testing" },
      { id: "balancing", name: "Dynamic Balancing" },
    ],
  },
];

// ── Grouped Industries ────────────────────────────────────
export type IndustryGroup = {
  group: string;
  items: { id: string; name: string }[];
};

export const INDUSTRY_GROUPS: IndustryGroup[] = [
  {
    group: "Mobility",
    items: [
      { id: "automotive", name: "Automotive" },
      { id: "two_wheeler", name: "Two Wheeler / Motorcycle" },
      { id: "commercial_vehicle", name: "Commercial Vehicles / Trucks" },
      { id: "ev", name: "Electric Vehicles (EV)" },
      { id: "aerospace", name: "Aerospace" },
      { id: "railway", name: "Railway / Rail Transport" },
      { id: "marine", name: "Marine / Shipbuilding" },
    ],
  },
  {
    group: "Industrial",
    items: [
      { id: "industrial_machinery", name: "Industrial Machinery" },
      { id: "heavy_equipment", name: "Heavy Equipment / Construction" },
      { id: "material_handling", name: "Material Handling" },
      { id: "pumps_valves", name: "Pumps & Valves" },
      { id: "pneumatics", name: "Pneumatics & Hydraulics" },
      { id: "tooling_jigs", name: "Tooling / Jigs & Fixtures" },
    ],
  },
  {
    group: "Energy & Resources",
    items: [
      { id: "oil_gas", name: "Oil & Gas" },
      { id: "power_generation", name: "Power Generation" },
      { id: "renewable_energy", name: "Renewable Energy (Solar / Wind)" },
      { id: "mining", name: "Mining & Minerals" },
    ],
  },
  {
    group: "Defense & Government",
    items: [
      { id: "defense", name: "Defense" },
      { id: "space", name: "Space & Satellites" },
      { id: "nuclear", name: "Nuclear" },
    ],
  },
  {
    group: "Healthcare & Science",
    items: [
      { id: "medical", name: "Medical Devices" },
      { id: "pharma", name: "Pharmaceutical" },
      { id: "laboratory", name: "Laboratory Equipment" },
    ],
  },
  {
    group: "Electronics & Technology",
    items: [
      { id: "electronics", name: "Electronics / Semiconductors" },
      { id: "telecom", name: "Telecommunications" },
      { id: "robotics", name: "Robotics & Automation" },
    ],
  },
  {
    group: "Agriculture & Food",
    items: [
      { id: "agriculture", name: "Agriculture / Agri Equipment" },
      { id: "food_processing", name: "Food Processing" },
    ],
  },
  {
    group: "Consumer & Retail",
    items: [
      { id: "consumer_products", name: "Consumer Products" },
      { id: "packaging_industry", name: "Packaging Industry" },
      { id: "furniture", name: "Furniture & Interiors" },
      { id: "sports", name: "Sports & Recreation" },
    ],
  },
  {
    group: "Construction & Infrastructure",
    items: [
      { id: "construction", name: "Construction" },
      { id: "infrastructure", name: "Infrastructure / Bridges" },
      { id: "plumbing_hvac", name: "Plumbing / HVAC" },
    ],
  },
];
