import type { SupplierOnboardingStatus } from "./supplier-onboarding-status";
import { isSupplierApproved } from "./supplier-onboarding-status";

export type SupplierMarketplaceAction =
  | "add_product"
  | "add_capability"
  | "create_listing"
  | "respond_rfq"
  | "view_premium_leads"
  | "bid_lead"
  | "publish_listing";

export type SupplierMarketplaceGateInput = {
  action: SupplierMarketplaceAction;
  onboardingStatus: SupplierOnboardingStatus;
  profileCompletionPercent: number;
  emailVerified: boolean;
  mobileVerified: boolean;
  requiredDocumentsUploaded: boolean;
  developmentTrustMode: boolean;
};

export type SupplierMarketplaceGateResult = {
  allowed: boolean;
  hardBlocked: boolean;
  message: string;
  missingRequirements: string[];
};

const ACTION_LABELS: Record<SupplierMarketplaceAction, string> = {
  add_product: "add products",
  add_capability: "add capabilities",
  create_listing: "create listings",
  respond_rfq: "respond to RFQs",
  view_premium_leads: "view premium leads",
  bid_lead: "bid on leads",
  publish_listing: "publish listings",
};

function collectMissingRequirements(input: SupplierMarketplaceGateInput): string[] {
  const missing: string[] = [];

  if (input.profileCompletionPercent < 100) {
    missing.push("Complete your profile to 100%");
  }
  if (!input.emailVerified) {
    missing.push("Verify your email");
  }
  if (!input.mobileVerified) {
    missing.push("Verify your mobile number");
  }
  if (!input.requiredDocumentsUploaded) {
    missing.push("Upload required verification documents");
  }
  if (!isSupplierApproved(input.onboardingStatus)) {
    if (input.onboardingStatus === "UNDER_REVIEW" || input.onboardingStatus === "PROFILE_SUBMITTED") {
      missing.push("Wait for admin approval");
    } else if (input.onboardingStatus === "CHANGES_REQUESTED") {
      missing.push("Address admin change requests and resubmit");
    } else if (input.onboardingStatus === "REJECTED") {
      missing.push("Your supplier application was rejected — contact support");
    } else if (input.onboardingStatus === "SUSPENDED") {
      missing.push("Your account is suspended");
    } else {
      missing.push("Submit profile for admin verification");
    }
  }

  return missing;
}

export function evaluateSupplierMarketplaceGate(
  input: SupplierMarketplaceGateInput,
): SupplierMarketplaceGateResult {
  const missingRequirements = collectMissingRequirements(input);
  const actionLabel = ACTION_LABELS[input.action];

  if (missingRequirements.length === 0) {
    return { allowed: true, hardBlocked: false, message: "", missingRequirements: [] };
  }

  const message = `Complete your profile to unlock marketplace features. You need to ${actionLabel}.`;

  if (input.developmentTrustMode) {
    return {
      allowed: true,
      hardBlocked: false,
      message,
      missingRequirements,
    };
  }

  return {
    allowed: false,
    hardBlocked: true,
    message,
    missingRequirements,
  };
}

export function canAccessMarketplaceFeatures(input: Omit<SupplierMarketplaceGateInput, "action">): boolean {
  return evaluateSupplierMarketplaceGate({ ...input, action: "add_product" }).allowed &&
    !evaluateSupplierMarketplaceGate({ ...input, action: "add_product" }).hardBlocked;
}
