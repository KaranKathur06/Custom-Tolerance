import assert from "node:assert/strict";
import test from "node:test";
import { getSellerV3HardGateStatus } from "../lib/marketplace/onboarding-v3";
import { validateSellerOnboardingStep } from "../lib/marketplace/seller-onboarding-validation";

const baseForm = {
  countryOrigin: "India",
  legalBusinessName: "Acme Manufacturing",
  addressLine1: "1 Industrial Road",
  city: "Pune",
  state: "Maharashtra",
  postalCode: "411001",
  gstNumber: "27ABCDE1234F1Z5",
  gstVerified: false,
};

test("seller onboarding allows GST entry without upload blockers in admin-review flow", () => {
  const result = validateSellerOnboardingStep("company_verification", {
    form: baseForm,
    documents: {},
    images: {},
  });

  assert.equal(result.valid, true);
  assert.equal(result.fieldErrors.length, 0);
});

test("seller activation is not blocked by missing GST or PAN uploads while admin review is pending", () => {
  const gate = getSellerV3HardGateStatus({
    ...baseForm,
    emailVerified: true,
    mobileVerified: true,
  });

  assert.equal(gate.canActivate, true);
  assert.equal(gate.missingRequirements.includes("Upload GST certificate"), false);
  assert.equal(gate.missingRequirements.includes("PAN card is required."), false);
});
