export type IrfqCreationMethod =
  | "manual"
  | "ai_quick"
  | "drawing_upload"
  | "bom_upload"
  | "quotation_upload"
  | "catalog_import"
  | "repeat"
  | "conversational"
  | "api_import"
  | "erp_integration";

export type IrfqPrivacyLevel =
  | "public"
  | "private"
  | "invite_only"
  | "anonymous"
  | "nda_protected";

export type IrfqSubscriptionPlan = "free" | "premium" | "enterprise";

export type IrfqDraftStatus = "draft" | "open" | "pending_review";

export type IrfqComposerStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type IrfqDraftPayload = {
  projectName?: string;
  rfqTitle?: string;
  title?: string;
  projectType?: string;
  industryId?: string;
  capabilityIds?: string[];
  description?: string;
  creationMethod?: IrfqCreationMethod;
  privacyLevel?: IrfqPrivacyLevel;
  composerStep?: number;
  composerData?: Record<string, unknown>;
  currencyCode?: string;
  targetPrice?: number | null;
  buyerCountry?: string;
  buyerState?: string;
  buyerCity?: string;
  deliveryState?: string;
  deliveryCity?: string;
  deliveryPostalCode?: string;
  deliveryMode?: string;
  shippingPreferences?: string[];
  paymentTerms?: string;
  paymentMode?: string;
  quotationDeadline?: string | null;
  manufacturingLeadTimeDays?: number | null;
  expectedDeliveryDate?: string | null;
  supplierLocationPref?: Record<string, boolean>;
  supplierRequirements?: Record<string, boolean>;
  advancedSupplierFilters?: Record<string, unknown>;
  capabilityMatrixFilters?: {
    requiredMachines?: string[];
    maxPartLengthMm?: number | null;
    maxPartWidthMm?: number | null;
    maxPartHeightMm?: number | null;
    minToleranceMm?: number | null;
    minDailyCapacity?: number | null;
    minMonthlyCapacity?: number | null;
    requiredInspection?: string[];
  };
};

export type IrfqItemInput = {
  itemName: string;
  partNumber?: string | null;
  partRevision?: string | null;
  drawingNumber?: string | null;
  description?: string | null;
  quantity: number;
  unit: string;
  annualRequirement?: number | null;
  moq?: number | null;
  targetPrice?: number | null;
  currencyCode?: string | null;
  tolerance?: string | null;
  toleranceCustom?: string | null;
  surfaceFinish?: string[];
  surfaceFinishCustom?: string | null;
  heatTreatment?: string | null;
  materials?: Array<{
    materialSlug?: string | null;
    materialName: string;
    materialGrade?: string | null;
    isCustomGrade?: boolean;
  }>;
  capabilityIds?: string[];
};

export type IrfqReferenceData = {
  projectTypes: Array<{ slug: string; name: string }>;
  units: Array<{ slug: string; name: string }>;
  currencies: Array<{ code: string; name: string; symbol: string; priority: number }>;
  tolerances: Array<{ slug: string; label: string }>;
  surfaceFinishes: Array<{ slug: string; name: string }>;
  materials: Array<{ slug: string; name: string; family: string }>;
  materialGrades: Array<{ slug: string; materialSlug: string | null; grade: string }>;
  incoterms: Array<{ slug: string; name: string }>;
  paymentTerms: Array<{ slug: string; name: string }>;
  paymentModes: Array<{ slug: string; name: string }>;
  shippingModes: Array<{ slug: string; name: string }>;
  turnoverRanges: Array<{ slug: string; label: string }>;
  employeeRanges: Array<{ slug: string; label: string }>;
  factorySizeRanges: Array<{ slug: string; label: string }>;
  productionCapacity: Array<{ slug: string; label: string }>;
  experienceYears: Array<{ slug: string; label: string; minYears: number }>;
  machineTypes: Array<{ slug: string; name: string; category: string }>;
  inspectionEquipment: Array<{ slug: string; name: string }>;
  certifications: Array<{ slug: string; name: string; category: string }>;
};

export type IrfqRiskAssessmentResult = {
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  factors: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    message: string;
    suggestion?: string;
  }>;
  supplierPoolSize: number;
  suggestions: string[];
};

export const IRFQ_COMPOSER_STEPS = [
  "Category",
  "Project",
  "Drawings",
  "Items",
  "Quality",
  "Location",
  "Commercial",
  "Review",
] as const;

export const IRFQ_PRIVACY_LEVELS: Array<{
  value: IrfqPrivacyLevel;
  label: string;
  description: string;
}> = [
  { value: "public", label: "Public RFQ", description: "Visible to qualified suppliers in the marketplace." },
  { value: "private", label: "Private RFQ", description: "Only invited suppliers can view this RFQ." },
  { value: "invite_only", label: "Invite-only RFQ", description: "Share with a selected supplier list." },
  { value: "anonymous", label: "Anonymous RFQ", description: "Buyer identity hidden from suppliers." },
  { value: "nda_protected", label: "NDA Protected RFQ", description: "Suppliers must accept NDA before access." },
];

export const IRFQ_CREATION_METHODS: Array<{
  id: IrfqCreationMethod;
  label: string;
  description: string;
  premium?: boolean;
  enterprise?: boolean;
}> = [
  { id: "manual", label: "Manual RFQ", description: "Step-by-step guided form" },
  { id: "ai_quick", label: "AI Quick RFQ", description: "Describe your need in one prompt", premium: true },
  { id: "drawing_upload", label: "Upload Drawing / CAD", description: "Extract specs from files" },
  { id: "bom_upload", label: "Upload Excel BOM", description: "Multi-line parts from spreadsheet", premium: true },
  { id: "quotation_upload", label: "Upload Quotation", description: "Reverse-engineer from vendor quote" },
  { id: "catalog_import", label: "Import Product Catalog", description: "From saved catalog items" },
  { id: "repeat", label: "Repeat Previous RFQ", description: "Clone and edit a past RFQ" },
  { id: "conversational", label: "AI Conversational RFQ", description: "Chat-guided RFQ builder", premium: true },
  { id: "api_import", label: "API RFQ Import", description: "Programmatic RFQ creation", enterprise: true },
  { id: "erp_integration", label: "ERP Integration", description: "Sync from your ERP", enterprise: true },
];
