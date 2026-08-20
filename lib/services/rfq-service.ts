export type BuyerVerificationStep = "email_verification" | "mobile_verification" | "profile_completion";

export type BuyerEligibilityState =
  | { status: "verified" }
  | { status: "unverified" | "partially_verified"; missing: BuyerVerificationStep[]; canPostAsDraft: true };

export function getBuyerEligibility(input: {
  emailVerified?: boolean;
  mobileVerified?: boolean;
  profileCompletionPercent?: number | null;
}): BuyerEligibilityState {
  const missing: BuyerVerificationStep[] = [];

  if (!input.emailVerified) missing.push("email_verification");
  if (!input.mobileVerified) missing.push("mobile_verification");
  if ((input.profileCompletionPercent ?? 0) < 40) missing.push("profile_completion");

  if (missing.length === 0) {
    return { status: "verified" };
  }

  if (missing.length === 1 && missing[0] === "profile_completion") {
    return { status: "partially_verified", missing, canPostAsDraft: true };
  }

  if (missing.includes("email_verification") && missing.includes("mobile_verification")) {
    return { status: "unverified", missing, canPostAsDraft: true };
  }

  return { status: "partially_verified", missing, canPostAsDraft: true };
}
