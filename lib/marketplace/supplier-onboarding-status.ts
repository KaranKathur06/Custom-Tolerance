export type SupplierOnboardingStatus =
  | "REGISTERED"
  | "PROFILE_INCOMPLETE"
  | "PROFILE_SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export const SUPPLIER_ONBOARDING_STATUS_LABELS: Record<SupplierOnboardingStatus, string> = {
  REGISTERED: "Registered",
  PROFILE_INCOMPLETE: "Profile Incomplete",
  PROFILE_SUBMITTED: "Profile Submitted",
  UNDER_REVIEW: "Under Review",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

const VALID_TRANSITIONS: Record<SupplierOnboardingStatus, SupplierOnboardingStatus[]> = {
  REGISTERED: ["PROFILE_INCOMPLETE"],
  PROFILE_INCOMPLETE: ["PROFILE_SUBMITTED", "SUSPENDED"],
  PROFILE_SUBMITTED: ["UNDER_REVIEW", "PROFILE_INCOMPLETE", "SUSPENDED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "CHANGES_REQUESTED", "SUSPENDED"],
  CHANGES_REQUESTED: ["PROFILE_INCOMPLETE", "PROFILE_SUBMITTED", "SUSPENDED"],
  APPROVED: ["SUSPENDED", "CHANGES_REQUESTED"],
  REJECTED: ["PROFILE_INCOMPLETE", "SUSPENDED"],
  SUSPENDED: ["PROFILE_INCOMPLETE", "UNDER_REVIEW"],
};

export function canTransitionOnboardingStatus(
  from: SupplierOnboardingStatus,
  to: SupplierOnboardingStatus,
): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function resolveOnboardingStatusFromCompletion(input: {
  currentStatus: SupplierOnboardingStatus;
  profileCompletionPercent: number;
  hasSubmitted: boolean;
}): SupplierOnboardingStatus {
  if (input.currentStatus === "APPROVED" || input.currentStatus === "SUSPENDED") {
    return input.currentStatus;
  }

  if (input.currentStatus === "UNDER_REVIEW" || input.currentStatus === "CHANGES_REQUESTED") {
    return input.currentStatus;
  }

  if (input.hasSubmitted && input.profileCompletionPercent >= 100) {
    return input.currentStatus === "PROFILE_SUBMITTED" ? "PROFILE_SUBMITTED" : "PROFILE_SUBMITTED";
  }

  if (input.profileCompletionPercent > 0) {
    return "PROFILE_INCOMPLETE";
  }

  return "REGISTERED";
}

export function isSupplierApproved(status: SupplierOnboardingStatus): boolean {
  return status === "APPROVED";
}

export function isSupplierUnderReview(status: SupplierOnboardingStatus): boolean {
  return status === "UNDER_REVIEW" || status === "PROFILE_SUBMITTED";
}

export function getOnboardingStatusTone(
  status: SupplierOnboardingStatus,
): "neutral" | "warning" | "success" | "danger" {
  switch (status) {
    case "APPROVED":
      return "success";
    case "REJECTED":
    case "SUSPENDED":
      return "danger";
    case "UNDER_REVIEW":
    case "PROFILE_SUBMITTED":
    case "CHANGES_REQUESTED":
      return "warning";
    default:
      return "neutral";
  }
}
