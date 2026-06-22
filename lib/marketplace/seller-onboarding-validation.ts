import { z } from "zod";
import {
  SELLER_ONBOARDING_V3_STEPS,
  type SellerOnboardingV3StepKey,
  SELLER_TYPES,
  CAPABILITY_CATEGORIES,
  FACTORY_PHOTO_CATEGORIES,
} from "./onboarding-v3";
import { getBankFieldConfig } from "@/lib/location/bank-fields";

export type SellerUploadAsset = {
  id: string;
  documentType?: string;
  category?: string;
  mediaType?: string;
  originalFilename: string;
  publicUrl?: string | null;
  signedUrl?: string | null;
  storagePath: string;
  bucketName: string;
  mimeType: string;
  fileSize: number;
};

export type SellerValidationInput = {
  form: Record<string, unknown>;
  documents: Record<string, SellerUploadAsset | undefined>;
  images: Record<string, SellerUploadAsset[]>;
  video?: SellerUploadAsset | null;
};

export type SellerValidationResult = {
  valid: boolean;
  fieldErrors: Array<{ field: string; message: string }>;
  missingLabels: string[];
};

export const SELLER_DOCUMENT_TYPE_KEYS = {
  cancelledCheque: "cancelled_cheque",
  gstCertificate: "gst_certificate",
  panCard: "pan_card",
  factoryLicense: "factory_license",
  iecCertificate: "iec_certificate",
  udyamCertificate: "udyam_certificate",
  dunsCertificate: "duns_certificate",
} as const;

export type SellerDocumentType = (typeof SELLER_DOCUMENT_TYPE_KEYS)[keyof typeof SELLER_DOCUMENT_TYPE_KEYS];

export const FACTORY_PHOTO_LIMITS: Record<string, { min: number; max: number }> = {
  Exterior: { min: 1, max: 10 },
  "Shop Floor": { min: 2, max: 10 },
  Machines: { min: 0, max: 10 },
  "QC Department": { min: 1, max: 10 },
  Warehouse: { min: 1, max: 10 },
  Office: { min: 0, max: 10 },
};

export const OVERALL_FACTORY_PHOTO_LIMITS = { min: 3, max: 20 };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTruthy(value: unknown): boolean {
  return Boolean(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string");
}

function hasDocument(documents: Record<string, SellerUploadAsset | undefined>, key: string): boolean {
  const doc = documents[key];
  return Boolean(doc && doc.id && doc.storagePath);
}

function fieldError(field: string, message: string): SellerValidationResult["fieldErrors"][number] {
  return { field, message };
}

function formatFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    countryOrigin: "Country of Origin",
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
  };

  return (
    labels[field] ??
    field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase())
      .trim()
  );
}

export function validateSellerOnboardingStep(
  stepKey: SellerOnboardingV3StepKey,
  input: SellerValidationInput,
): SellerValidationResult {
  const fieldErrors: SellerValidationResult["fieldErrors"] = [];

  const addError = (field: string, message: string) => {
    fieldErrors.push(fieldError(field, message));
  };

  const { form, documents } = input;
  const countryOrigin = String(form.countryOrigin ?? "").toLowerCase();
  const isIndia = countryOrigin === "india";

  switch (stepKey) {
    case "company_verification": {
      if (!isNonEmptyString(form.countryOrigin)) addError("countryOrigin", "Country of origin is required.");
      if (!isNonEmptyString(form.legalBusinessName)) addError("legalBusinessName", "Legal business name is required.");

      // Structured address
      if (!isNonEmptyString(form.addressLine1)) addError("addressLine1", "Address line 1 is required.");
      if (!isNonEmptyString(form.city)) addError("city", "City is required.");
      if (!isNonEmptyString(form.state)) addError("state", "State is required.");
      if (!isNonEmptyString(form.postalCode)) addError("postalCode", "Postal code is required.");

      if (isIndia) {
        // India: GST required
        if (!isNonEmptyString(form.gstNumber)) addError("gstNumber", "GST number is required.");
        if (!isTruthy(form.gstVerified)) addError("gstVerified", "GST must be verified before continuing.");
      } else {
        // International: verification type required
        const verificationType = String(form.verificationType ?? "");
        if (!verificationType) addError("verificationType", "Please select a verification type.");
        if (verificationType === "DUNS Number") {
          if (!isNonEmptyString(form.dunsNumber)) addError("dunsNumber", "DUNS number is required.");
        }
        if (verificationType === "Company Registration Number") {
          if (!isNonEmptyString(form.companyRegistrationNumber)) {
            addError("companyRegistrationNumber", "Company registration number is required.");
          }
        }
      }
      break;
    }

    case "basic_information": {
      if (!isNonEmptyString(form.contactPersonName)) addError("contactPersonName", "Contact person name is required.");
      if (!isNonEmptyString(form.designation)) addError("designation", "Designation is required.");
      if (!isNonEmptyString(form.mobileNumber)) addError("mobileNumber", "Mobile number is required.");
      if (!isTruthy(form.mobileVerified)) addError("mobileVerified", "Mobile number must be verified.");
      if (!isNonEmptyString(form.businessEmail)) addError("businessEmail", "Business email is required.");
      if (!isTruthy(form.emailVerified)) addError("emailVerified", "Email must be verified.");
      break;
    }

    case "registration_complete": {
      // No required fields Ã¢â‚¬â€ display-only step
      break;
    }

    case "business_details": {
      const sellerTypes = form.sellerTypes;
      if (!Array.isArray(sellerTypes) || sellerTypes.length === 0) {
        addError("sellerTypes", "Select at least one seller type.");
      }
      break;
    }

    case "bank_details": {
      const countryOrigin = String(form.countryOrigin || "");
      const bankConfig = getBankFieldConfig(countryOrigin);

      // Validate country-aware required bank fields
      for (const fieldDef of bankConfig.fields) {
        if (fieldDef.required && !isNonEmptyString(form[fieldDef.key])) {
          addError(fieldDef.key, `${fieldDef.label} is required.`);
        }
      }

      // Account mismatch check
      if (
        isNonEmptyString(form.accountNumber) &&
        isNonEmptyString(form.confirmAccountNumber) &&
        form.accountNumber !== form.confirmAccountNumber
      ) {
        addError("confirmAccountNumber", "Account numbers do not match.");
      }

      if (!isTruthy(form.sellerAgreement)) addError("sellerAgreement", "You must accept the Seller Agreement.");
      if (!isTruthy(form.termsAccepted)) addError("termsAccepted", "You must accept the Terms & Conditions.");
      if (!isTruthy(form.privacyAccepted)) addError("privacyAccepted", "You must accept the Privacy Policy.");
      if (!isTruthy(form.kycConsent)) addError("kycConsent", "You must accept the KYC Consent.");
      break;
    }

    default:
      break;
  }

  const missingLabels = fieldErrors.map((error) => formatFieldLabel(error.field));

  return {
    valid: fieldErrors.length === 0,
    fieldErrors,
    missingLabels,
  };
}

export function getMissingFieldsMessage(result: SellerValidationResult): string {
  if (result.valid) return "";
  const uniqueLabels = Array.from(new Set(result.missingLabels));
  return `Please complete all required fields before continuing. You still need to complete: ${uniqueLabels.join(", ")}.`;
}
