import {
  calculateProfileCompletion,
  type ProfileCompletionResult,
  type ProfileCompletionSection,
} from "./profile-completion";

export const SUPPLIER_VERIFICATION_COMPLETION_SECTIONS: ProfileCompletionSection[] = [
  {
    key: "company_information",
    label: "Company Information",
    requiredFields: [
      "companyName",
      "legalBusinessName",
      "businessType",
      "companyDescription",
      "yearEstablished",
      "numberOfEmployees",
      "website",
      "linkedinUrl",
      "countryId",
      "stateId",
      "cityId",
      "fullAddress",
      "pincode",
      "latitude",
      "longitude",
    ],
    weight: 20,
  },
  {
    key: "business_verification",
    label: "Business Verification",
    requiredFields: ["gstNumber", "panNumber"],
    weight: 25,
  },
  {
    key: "manufacturing_details",
    label: "Manufacturing Details",
    requiredFields: ["capabilities"],
    weight: 20,
  },
  {
    key: "contact_verification",
    label: "Contact Verification",
    requiredFields: ["emailVerified", "mobileVerified"],
    weight: 15,
  },
  {
    key: "documents_upload",
    label: "Documents Upload",
    requiredFields: ["gstCertificate", "panCard", "companyRegistration"],
    weight: 20,
  },
];

export const MANDATORY_DOCUMENT_TYPES = ["gst_certificate", "pan_card", "company_registration"] as const;

export const FACTORY_MEDIA_CATEGORIES = [
  "reception",
  "office",
  "shop_floor",
  "machines",
  "inspection_area",
  "warehouse",
] as const;

export const MANUFACTURING_PROCESSES = [
  "Casting",
  "Forging",
  "Machining",
  "Fabrication",
  "Injection Molding",
  "Stamping",
  "Extrusion",
  "3D Printing",
  "Heat Treatment",
  "Surface Finishing",
] as const;

export const BUSINESS_TYPES = [
  "Manufacturer",
  "Job Work Shop",
  "Casting Foundry",
  "Machining Unit",
  "Fabricator",
  "Exporter",
  "Distributor",
  "Trader",
  "OEM",
] as const;

export const QUALITY_CERTIFICATIONS = [
  "ISO 9001",
  "IATF 16949",
  "AS9100",
  "ISO 13485",
  "NADCAP",
] as const;

export type SupplierProfileData = Record<string, unknown>;

export function buildSupplierProfileDataFromDraft(draft: Record<string, unknown>): SupplierProfileData {
  const capabilities = Array.isArray(draft.capabilities) ? draft.capabilities : [];
  const documents = Array.isArray(draft.documents) ? draft.documents : [];
  const factoryPhotos = Array.isArray(draft.factoryPhotos) ? draft.factoryPhotos : [];

  const docTypes = new Set(
    documents
      .filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
      .map((d) => d.documentType as string)
      .filter(Boolean),
  );

  return {
    companyName: draft.companyName,
    legalBusinessName: draft.legalBusinessName,
    businessType: draft.businessType,
    companyDescription: draft.companyDescription,
    yearEstablished: draft.yearEstablished,
    numberOfEmployees: draft.numberOfEmployees ?? draft.companySize,
    website: draft.website,
    linkedinUrl: draft.linkedinUrl,
    countryId: draft.countryId,
    stateId: draft.stateId,
    cityId: draft.cityId,
    fullAddress: draft.fullAddress ?? draft.factoryAddress,
    pincode: draft.pincode,
    latitude: draft.latitude,
    longitude: draft.longitude,
    gstNumber: draft.gstNumber,
    panNumber: draft.panNumber,
    capabilities: capabilities.length > 0 ? capabilities : null,
    emailVerified: Boolean(draft.emailVerified),
    mobileVerified: Boolean(draft.mobileVerified ?? draft.phoneVerified),
    gstCertificate: docTypes.has("gst_certificate") ? true : draft.gstCertificateUrl,
    panCard: docTypes.has("pan_card") ? true : draft.panCardUrl,
    companyRegistration: docTypes.has("company_registration") ? true : draft.companyRegistrationUrl,
    factoryPhotoCount: factoryPhotos.length,
  };
}

export function calculateSupplierProfileCompletion(
  data: SupplierProfileData,
): ProfileCompletionResult {
  return calculateProfileCompletion(data, SUPPLIER_VERIFICATION_COMPLETION_SECTIONS);
}

export function getRemainingCompletionItems(
  result: ProfileCompletionResult,
): Array<{ label: string; section: string }> {
  const items: Array<{ label: string; section: string }> = [];

  for (const section of result.sections) {
    for (const field of section.missingFields) {
      items.push({ label: formatMissingFieldLabel(field), section: section.label });
    }
  }

  return items;
}

function formatMissingFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    companyName: "Add company name",
    legalBusinessName: "Add legal business name",
    businessType: "Select business type",
    companyDescription: "Add company description",
    yearEstablished: "Add year established",
    numberOfEmployees: "Add number of employees",
    website: "Add website",
    linkedinUrl: "Add LinkedIn profile",
    countryId: "Select country",
    stateId: "Select state",
    cityId: "Select city",
    fullAddress: "Add full address",
    pincode: "Add pincode",
    latitude: "Set map location",
    longitude: "Set map location",
    gstNumber: "Add GST number",
    panNumber: "Add PAN number",
    capabilities: "Add manufacturing capabilities",
    emailVerified: "Verify email",
    mobileVerified: "Verify mobile",
    gstCertificate: "Upload GST certificate",
    panCard: "Upload PAN card",
    companyRegistration: "Upload company registration",
  };

  return labels[field] ?? `Complete ${field}`;
}
