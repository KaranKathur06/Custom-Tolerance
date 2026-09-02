import assert from "node:assert/strict";
import test from "node:test";
import { calculateSellerOnboardingV3Completion } from "../lib/marketplace/onboarding-v3";
import { SELLER_DOCUMENT_TYPE_KEYS, validateSellerOnboardingStep } from "../lib/marketplace/seller-onboarding-validation";

const baseForm = {
  countryOrigin: "India",
  legalBusinessName: "Acme Manufacturing",
  addressLine1: "1 Industrial Road",
  city: "Pune",
  state: "Maharashtra",
  postalCode: "411001",
  gstNumber: "27ABCDE1234F1Z5",
  gstVerified: true,
};

test("seller verification requires active GST and PAN documents", () => {
  const result = validateSellerOnboardingStep("company_verification", {
    form: baseForm,
    documents: {
      [SELLER_DOCUMENT_TYPE_KEYS.gstCertificate]: { id: "gst", storagePath: "active" } as never,
    },
    images: {},
  });

  assert.ok(result.fieldErrors.some((error) => error.field === "panCardDocumentId"));
});

test("seller completion falls when an active verification document is deleted", () => {
  const withDocuments = calculateSellerOnboardingV3Completion({ ...baseForm, gstCertificate: true, panCard: true }, ["company_verification"]);
  const withoutGst = calculateSellerOnboardingV3Completion({ ...baseForm, gstCertificate: false, panCard: true }, ["company_verification"]);

  assert.ok(withoutGst.overallPercent < withDocuments.overallPercent);
});
