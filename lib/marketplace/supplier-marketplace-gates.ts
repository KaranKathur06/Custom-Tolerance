import type { SupplierOnboardingStatus } from "./supplier-onboarding-status";

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

  /**
   * Development-only override
   */
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

const PREMIUM_ACTIONS: SupplierMarketplaceAction[] = ["view_premium_leads", "bid_lead"];
const TIER1_ACTIONS: SupplierMarketplaceAction[] = [
  "add_product",
  "add_capability",
  "create_listing",
  "publish_listing",
  "respond_rfq",
];

function isPhase1Active(input: SupplierMarketplaceGateInput): boolean {
  // Phase 1: seller can transact once REGISTERED + identity verified + registration documents verified.
  return (
    input.onboardingStatus === "REGISTERED" &&
    input.emailVerified &&
    input.mobileVerified &&
    input.requiredDocumentsUploaded
  );
}

function hardMissingPhase1(input: SupplierMarketplaceGateInput): string[] {
  const missing: string[] = [];

  if (input.onboardingStatus !== "REGISTERED") missing.push("Complete registration to activate your account");
  if (!input.emailVerified) missing.push("Verify your email");
  if (!input.mobileVerified) missing.push("Verify your mobile number");
  if (!input.requiredDocumentsUploaded) missing.push("Upload required verification documents");

  if (input.onboardingStatus === "UNDER_REVIEW" || input.onboardingStatus === "PROFILE_SUBMITTED") {
    missing.push("Wait for admin review");
  } else if (input.onboardingStatus === "CHANGES_REQUESTED") {
    missing.push("Address admin change requests and resubmit");
  } else if (input.onboardingStatus === "REJECTED") {
    missing.push("Your supplier application was rejected — contact support");
  } else if (input.onboardingStatus === "SUSPENDED") {
    missing.push("Your account is suspended");
  }

  return Array.from(new Set(missing));
}

function softMissingItemsForAction(
  input: SupplierMarketplaceGateInput,
  action: SupplierMarketplaceAction,
): string[] {
  // Phase 2 should not block Tier 1 actions. Provide guidance only.
  const missing: string[] = [];

  if (action !== "publish_listing" && input.profileCompletionPercent < 30) {
    missing.push("Improve profile strength to increase visibility");
  }

  if (action === "publish_listing" && input.profileCompletionPercent < 60) {
    missing.push("Increase profile strength for better listing visibility");
  }

  return missing;
}

export function evaluateSupplierMarketplaceGate(
  input: SupplierMarketplaceGateInput,
): SupplierMarketplaceGateResult {
  const actionLabel = ACTION_LABELS[input.action];

  if (input.developmentTrustMode) {
    return {
      allowed: true,
      hardBlocked: false,
      message: "",
      missingRequirements: softMissingItemsForAction(input, input.action),
    };
  }

  // Premium actions are hard-blocked until Phase 1 is active.
  // (Later iterations can add higher tiers based on trust/badges/subscription.)
  if (PREMIUM_ACTIONS.includes(input.action)) {
    if (!isPhase1Active(input)) {
      const hard = hardMissingPhase1(input);
      return {
        allowed: false,
        hardBlocked: true,
        message: `Complete registration to unlock ${actionLabel}.`,
        missingRequirements: hard,
      };
    }

    // Tier 1/Phase 1 already allows marketplace access;
    // Premium gating will be implemented in a follow-up when trustScore/subscription are included in input.
    return {
      allowed: true,
      hardBlocked: false,
      message: "",
      missingRequirements: [],
    };
  }

  // Tier 1 actions (incl publish_listing and respond_rfq) only require Phase 1.
  if (!TIER1_ACTIONS.includes(input.action)) {
    // Safety fallback
    if (!isPhase1Active(input)) {
      const hard = hardMissingPhase1(input);
      return {
        allowed: false,
        hardBlocked: true,
        message: `Complete registration to unlock ${actionLabel}.`,
        missingRequirements: hard,
      };
    }
    return { allowed: true, hardBlocked: false, message: "", missingRequirements: [] };
  }

  if (!isPhase1Active(input)) {
    const hard = hardMissingPhase1(input);
    return {
      allowed: false,
      hardBlocked: true,
      message: `Complete registration to unlock ${actionLabel}.`,
      missingRequirements: hard,
    };
  }

  // Phase 2/100% completion never hard-blocks Tier 1 actions in the new philosophy.
  return {
    allowed: true,
    hardBlocked: false,
    message: "",
    missingRequirements: softMissingItemsForAction(input, input.action),
  };
}

export function canAccessMarketplaceFeatures(input: Omit<SupplierMarketplaceGateInput, "action">): boolean {
  return evaluateSupplierMarketplaceGate({ ...input, action: "add_product" }).allowed &&
    !evaluateSupplierMarketplaceGate({ ...input, action: "add_product" }).hardBlocked;
}
