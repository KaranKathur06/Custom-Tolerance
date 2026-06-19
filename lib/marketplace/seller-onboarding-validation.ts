import { z } from "zod";
import {
  SELLER_ONBOARDING_V3_STEPS,
  type SellerOnboardingV3StepKey,
  SELLER_TYPES,
  CAPABILITY_CATEGORIES,
  SUB_CAPABILITIES,
  MATERIAL_OPTIONS,
  FACTORY_PHOTO_CATEGORIES,
} from "./onboarding-v3";

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
  Exterior: { min: 1, max: 5 },
  "Shop Floor": { min: 2, max: 10 },
  Machines: { min: 0, max: 10 },
  "QC Department": { min: 1, max: 5 },
  Warehouse: { min: 1, max: 5 },
  Office: { min: 0, max: 5 },
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
    gstNumber: "GST Number",
    gstVerified: "GST Verification",
    legalBusinessName: "Legal Business Name",
    contactPersonName: "Contact Person",
    designation: "Designation",
    mobileNumber: "Mobile Number",
    mobileVerified: "Mobile Verification",
    businessEmail: "Business Email",
    emailVerified: "Email Verification",
    factoryAddress: "Factory Address",
    sellerType: "Seller Type",
    mainIndustry: "Main Industry",
    capabilityCategories: "Capability Categories",
    subCapabilities: "Sub Capabilities",
    materials: "Materials",
    monthlyCapacity: "Monthly Capacity",
    moq: "MOQ",
    leadTime: "Lead Time",
    factoryArea: "Factory Area",
    shopFloorEmployees: "Shop Floor Employees",
    engineers: "Engineers",
    qcTeamSize: "QC Team Size",
    bankName: "Bank Name",
    accountHolderName: "Account Holder Name",
    accountNumber: "Account Number",
    confirmAccountNumber: "Confirm Account Number",
    ifscCode: "IFSC Code",
    branchName: "Branch Name",
    panNumber: "PAN Number",
    iecNumber: "IEC Number",
    cancelledChequeDocumentId: "Cancelled Cheque",
    gstCertificateDocumentId: "GST Certificate",
    panCardDocumentId: "PAN Card",
    factoryLicenseDocumentId: "Factory License",
    iecCertificateDocumentId: "IEC Certificate",
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

  const { form, documents, images, video } = input;
  const sellerType = String(form.sellerType ?? "");
  const isExporter = sellerType === "Exporter";

  switch (stepKey) {
    case "gst_verification": {
      if (!isNonEmptyString(form.gstNumber)) addError("gstNumber", "GST number is required.");
      if (!isTruthy(form.gstVerified)) addError("gstVerified", "GST must be verified before continuing.");
      if (!isNonEmptyString(form.legalBusinessName)) addError("legalBusinessName", "Legal business name is required.");
      break;
    }

    case "basic_information": {
      if (!isNonEmptyString(form.contactPersonName)) addError("contactPersonName", "Contact person name is required.");
      if (!isNonEmptyString(form.designation)) addError("designation", "Designation is required.");
      if (!isNonEmptyString(form.mobileNumber)) addError("mobileNumber", "Mobile number is required.");
      if (!isTruthy(form.mobileVerified)) addError("mobileVerified", "Mobile number must be verified.");
      if (!isNonEmptyString(form.businessEmail)) addError("businessEmail", "Business email is required.");
      if (!isTruthy(form.emailVerified)) addError("emailVerified", "Email must be verified.");
      if (!isNonEmptyString(form.factoryAddress)) addError("factoryAddress", "Factory address is required.");
      break;
    }

    case "business_details": {
      if (!isNonEmptyString(form.sellerType)) addError("sellerType", "Seller type is required.");
      if (!isNonEmptyString(form.mainIndustry)) addError("mainIndustry", "Main industry is required.");
      if (!isStringArray(form.capabilityCategories)) addError("capabilityCategories", "Select at least one capability category.");
      if (!Array.isArray(form.subCapabilities) || (form.subCapabilities as unknown[]).length === 0) {
        addError("subCapabilities", "Select at least one sub capability.");
      }
      if (!isStringArray(form.materials)) addError("materials", "Select at least one material.");
      if (!isNonEmptyString(form.monthlyCapacity)) addError("monthlyCapacity", "Please enter monthly production capacity.");
      if (!isNonEmptyString(form.moq)) addError("moq", "MOQ is required.");
      if (!isNonEmptyString(form.leadTime)) addError("leadTime", "Lead time is required.");
      if (!isNonEmptyString(form.factoryArea)) addError("factoryArea", "Factory area is required.");
      if (!isNonEmptyString(form.shopFloorEmployees)) addError("shopFloorEmployees", "Shop floor employee count is required.");
      if (!isNonEmptyString(form.engineers)) addError("engineers", "Engineer count is required.");
      if (!isNonEmptyString(form.qcTeamSize)) addError("qcTeamSize", "QC team size is required.");
      break;
    }

    case "bank_financial_verification": {
      if (!isNonEmptyString(form.bankName)) addError("bankName", "Bank name is required.");
      if (!isNonEmptyString(form.accountHolderName)) addError("accountHolderName", "Account holder name is required.");
      if (!isNonEmptyString(form.accountNumber)) addError("accountNumber", "Account number is required.");
      if (!isNonEmptyString(form.confirmAccountNumber)) {
        addError("confirmAccountNumber", "Please confirm account number.");
      } else if (form.accountNumber !== form.confirmAccountNumber) {
        addError("confirmAccountNumber", "Account numbers do not match.");
      }
      if (!isNonEmptyString(form.ifscCode)) addError("ifscCode", "IFSC code is required.");
      if (!isNonEmptyString(form.branchName)) addError("branchName", "Branch name is required.");
      if (!isNonEmptyString(form.panNumber)) addError("panNumber", "PAN number is required.");

      if (!hasDocument(documents, SELLER_DOCUMENT_TYPE_KEYS.cancelledCheque)) {
        addError("cancelledChequeDocumentId", "Cancelled cheque upload is required.");
      }
      if (!hasDocument(documents, SELLER_DOCUMENT_TYPE_KEYS.gstCertificate)) {
        addError("gstCertificateDocumentId", "GST certificate upload is required.");
      }
      if (!hasDocument(documents, SELLER_DOCUMENT_TYPE_KEYS.panCard)) {
        addError("panCardDocumentId", "PAN card upload is required.");
      }
      if (!hasDocument(documents, SELLER_DOCUMENT_TYPE_KEYS.factoryLicense)) {
        addError("factoryLicenseDocumentId", "Factory license upload is required.");
      }

      if (isExporter) {
        if (!isNonEmptyString(form.iecNumber)) addError("iecNumber", "IEC number is required for exporters.");
        if (!hasDocument(documents, SELLER_DOCUMENT_TYPE_KEYS.iecCertificate)) {
          addError("iecCertificateDocumentId", "IEC certificate upload is required for exporters.");
        }
      }

      if (!isTruthy(form.sellerAgreement)) addError("sellerAgreement", "You must accept the Seller Agreement.");
      if (!isTruthy(form.termsAccepted)) addError("termsAccepted", "You must accept the Terms & Conditions.");
      if (!isTruthy(form.privacyAccepted)) addError("privacyAccepted", "You must accept the Privacy Policy.");
      if (!isTruthy(form.kycConsent)) addError("kycConsent", "You must accept the KYC Consent.");
      break;
    }

    case "profile_completion": {
      let totalPhotos = 0;
      for (const category of FACTORY_PHOTO_CATEGORIES) {
        const items = images[category] ?? [];
        totalPhotos += items.length;
        const limits = FACTORY_PHOTO_LIMITS[category];
        if (limits) {
          if (items.length < limits.min) {
            addError(
              `factoryPhotos_${category}`,
              `${category} requires at least ${limits.min} photo${limits.min === 1 ? "" : "s"}.`,
            );
          }
          if (items.length > limits.max) {
            addError(
              `factoryPhotos_${category}`,
              `${category} allows at most ${limits.max} photos.`,
            );
          }
        }
      }
      if (totalPhotos < OVERALL_FACTORY_PHOTO_LIMITS.min) {
        addError("factoryPhotos", `Factory photos require at least ${OVERALL_FACTORY_PHOTO_LIMITS.min} images total.`);
      }
      if (totalPhotos > OVERALL_FACTORY_PHOTO_LIMITS.max) {
        addError("factoryPhotos", `Factory photos allow at most ${OVERALL_FACTORY_PHOTO_LIMITS.max} images total.`);
      }

      const machines = Array.isArray(form.machines) ? (form.machines as Record<string, unknown>[]) : [];
      if (machines.length === 0) {
        addError("machines", "Add at least one machine.");
      }
      for (let i = 0; i < machines.length; i++) {
        const row = machines[i];
        if (!isNonEmptyString(row.machineName)) {
          addError(`machines[${i}].machineName`, "Machine name is required.");
        }
      }

      const certifications = Array.isArray(form.certifications) ? (form.certifications as Record<string, unknown>[]) : [];
      for (let i = 0; i < certifications.length; i++) {
        const row = certifications[i];
        if (!isNonEmptyString(row.certificateName)) {
          addError(`certifications[${i}].certificateName`, "Certificate name is required.");
        }
        if (!isNonEmptyString(row.certificateFileId ?? row.documentUrl)) {
          addError(`certifications[${i}].certificateFileId`, "Certificate PDF upload is required.");
        }
      }

      const exportExperience = Array.isArray(form.exportExperience)
        ? (form.exportExperience as Record<string, unknown>[])
        : [];
      for (let i = 0; i < exportExperience.length; i++) {
        const row = exportExperience[i];
        if (!isNonEmptyString(row.customerName)) {
          addError(`exportExperience[${i}].customerName`, "Customer name is required.");
        }
        if (!isNonEmptyString(row.country)) {
          addError(`exportExperience[${i}].country`, "Country is required.");
        }
        if (!isNonEmptyString(row.proofFileId ?? row.proofDocumentUrl)) {
          addError(`exportExperience[${i}].proofFileId`, "Proof of export upload is required.");
        }
      }
      break;
    }

    case "registration_complete":
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
