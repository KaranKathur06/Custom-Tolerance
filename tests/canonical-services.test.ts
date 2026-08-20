import test from "node:test";
import assert from "node:assert/strict";

import {
  getVerificationState,
  normalizeVerificationState,
} from "@/lib/services/verification-service";
import {
  getProfileCompletion,
  normalizeProfileCompletionSnapshot,
} from "@/lib/services/profile-service";
import {
  ENTITY_AUTHORITY_MAP,
  resolveEntityAuthority,
} from "@/lib/services/entity-authority";
import { getBuyerEligibility } from "@/lib/services/rfq-service";
import { canEnterPhase } from "@/lib/services/product-service";
import { canTransitionQuoteLifecycle } from "@/lib/services/quote-lifecycle";
import { canResumeDraft, canPublishDraft, normalizeDraftState, filterDrafts, getResumeUrl } from "@/lib/services/rfq-draft-service";
import { canPublishRfq, normalizePublishedState, validatePublishTransition, getPublishedUrl } from "@/lib/services/rfq-publish-service";
import {
  isRfqAcceptingQuotes,
  validateResponderEligibility,
  canProcessQuoteAction,
  normalizeQuoteOperationalState,
  getQuoteSubmissionDeadline,
} from "@/lib/services/quote-operational-lifecycle";
import {
  canResumeProductDraft,
  canPublishProductDraft,
  normalizeDraftProductState,
  filterDraftProducts,
  getProductResumeUrl,
  calculateProductCompletion,
  getCurrentProductPhase,
} from "@/lib/services/product-draft-service";

test("normalizeVerificationState marks missing checks and profile completion", () => {
  const state = normalizeVerificationState({
    emailVerified: false,
    mobileVerified: true,
    profileCompletionPercent: 35,
    documentCount: 1,
    requiredDocumentCount: 2,
    approvedDocumentCount: 1,
  });

  assert.equal(state.overallStatus, "partially_verified");
  assert.equal(state.items.email.status, "missing");
  assert.equal(state.items.profile.status, "missing");
  assert.deepEqual(state.missing, ["email", "gst", "profile", "documents"]);
});

test("getVerificationState returns a canonical status snapshot for a verified buyer", () => {
  const state = getVerificationState({
    emailVerified: true,
    mobileVerified: true,
    profileCompletionPercent: 100,
    documentCount: 2,
    requiredDocumentCount: 2,
    approvedDocumentCount: 2,
  });

  assert.equal(state.overallStatus, "verified");
  assert.equal(state.items.email.status, "verified");
  assert.equal(state.items.mobile.status, "verified");
  assert.equal(state.items.profile.status, "verified");
});

test("normalizeProfileCompletionSnapshot returns a complete buyer completion summary", () => {
  const snapshot = normalizeProfileCompletionSnapshot(
    {
      companyName: "Northline Metals",
      emailVerified: true,
      procurementCategoryId: "steel",
      businessType: "Manufacturer",
      countryId: "IN",
      cityId: "MUM",
    },
    "buyer",
  );

  assert.equal(snapshot.percentage, 100);
  assert.equal(snapshot.completed, 6);
  assert.equal(snapshot.total, 6);
  assert.deepEqual(snapshot.missing, []);
  assert.equal(snapshot.role, "buyer");
});

test("getProfileCompletion accepts a legacy profile object and resolves missing fields", () => {
  const snapshot = getProfileCompletion(
    {
      companyName: "Acme Foundry",
      emailVerified: true,
      procurementCategoryId: "steel",
    },
    "buyer",
  );

  assert.equal(snapshot.percentage, 50);
  assert.ok(snapshot.missing.some((item) => item.key === "businessType"));
  assert.ok(snapshot.missing.some((item) => item.key === "countryId"));
});

test("entity authority map documents the current production authority", () => {
  assert.equal(ENTITY_AUTHORITY_MAP.verification.canonicalOwner, "Supabase");
  assert.equal(resolveEntityAuthority("verification").canonicalOwner, "Supabase");
  assert.equal(resolveEntityAuthority("rfq").canonicalOwner, "Supabase");
});

test("getBuyerEligibility recommends the correct RFQ track based on canonical verification state", () => {
  const state = getBuyerEligibility({
    emailVerified: false,
    mobileVerified: true,
    profileCompletionPercent: 35,
  });

  assert.equal(state.status, "partially_verified");
  assert.deepEqual(state.missing, ["email_verification", "profile_completion"]);
  assert.equal(state.canPostAsDraft, true);
});

test("canEnterPhase prevents skipping incomplete product phases", () => {
  const validDraft = {
    productName: "Test Product",
    priceType: "fixed",
    minPrice: 100,
    currency: "USD",
    capabilities: ["Machining"],
    materials: ["Steel"],
    tolerance: "pm0_1mm",
  };

  assert.equal(canEnterPhase(validDraft, 1), true);
  assert.equal(canEnterPhase(validDraft, 2), true);
  assert.equal(canEnterPhase({ ...validDraft, productName: "" }, 2), false);
  assert.equal(canEnterPhase({ ...validDraft, minPrice: undefined }, 2), false);
});

test("canTransitionQuoteLifecycle enforces the quote state machine", () => {
  assert.equal(canTransitionQuoteLifecycle("submitted", "view"), true);
  assert.equal(canTransitionQuoteLifecycle("submitted", "accept"), true);
  assert.equal(canTransitionQuoteLifecycle("draft", "accept"), false);
  assert.equal(canTransitionQuoteLifecycle("accepted", "reject"), false);
});

test("canResumeDraft allows editing of draft RFQs only", () => {
  assert.equal(canResumeDraft({ status: "draft", deletedAt: null }), true);
  assert.equal(canResumeDraft({ status: "draft", deletedAt: "2026-01-01" }), false);
  assert.equal(canResumeDraft({ status: "open", deletedAt: null }), false);
});

test("canPublishDraft requires draft status and sufficient completion", () => {
  assert.equal(
    canPublishDraft({ status: "draft", title: "Test RFQ", composerStep: 3, deletedAt: null }),
    true,
  );
  assert.equal(canPublishDraft({ status: "draft", title: "", composerStep: 3 }), false);
  assert.equal(canPublishDraft({ status: "draft", title: "Test", composerStep: 1 }), false);
});

test("normalizeDraftState creates canonical draft state from RFQ record", () => {
  const state = normalizeDraftState({
    id: "rfq-123",
    status: "draft",
    title: "Steel Components",
    slug: "steel-components",
    composer_step: 2,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
  });

  assert.deepEqual(state, {
    id: "rfq-123",
    status: "draft",
    title: "Steel Components",
    slug: "steel-components",
    composerStep: 2,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
    canResume: true,
    canPublish: false,
  });
});

test("filterDrafts extracts draft RFQs from mixed list", () => {
  const mixed = [
    { id: "1", status: "draft", title: "Draft 1", composer_step: 2 },
    { id: "2", status: "open", title: "Published" },
    { id: "3", status: "draft", title: "Draft 2", composer_step: 4 },
  ];

  const drafts = filterDrafts(mixed);
  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].id, "1");
  assert.equal(drafts[1].id, "3");
});

test("getResumeUrl constructs resume link with draft ID", () => {
  const url = getResumeUrl("draft-abc123");
  assert.equal(url, "/rfq/new?draft=draft-abc123");
});

test("canPublishRfq requires draft status and sufficient completion", () => {
  assert.equal(
    canPublishRfq({ id: "1", status: "draft", title: "Test RFQ", composer_step: 3 }).allowed,
    true,
  );
  assert.equal(
    canPublishRfq({ id: "1", status: "draft", title: "", composer_step: 3 }).allowed,
    false,
  );
  assert.equal(
    canPublishRfq({ id: "1", status: "draft", title: "Test", composer_step: 1 }).allowed,
    false,
  );
  assert.equal(
    canPublishRfq({ id: "1", status: "open", title: "Test", composer_step: 3 }).allowed,
    false,
  );
});

test("normalizePublishedState creates canonical published state from RFQ record", () => {
  const state = normalizePublishedState({
    id: "rfq-123",
    status: "open",
    title: "Steel Components",
    slug: "steel-components",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
    published_at: "2026-01-15T10:30:00Z",
    visibility_level: "standard",
    buyer_profile_id: "buyer-456",
  });

  assert.deepEqual(state, {
    id: "rfq-123",
    status: "open",
    title: "Steel Components",
    slug: "steel-components",
    publishedAt: "2026-01-15T10:30:00Z",
    buyerProfileId: "buyer-456",
    visibility: "standard",
  });
});

test("validatePublishTransition enforces draft to open transition only", () => {
  assert.equal(validatePublishTransition("draft", "open").valid, true);
  assert.equal(validatePublishTransition("draft", "quoted").valid, false);
  assert.equal(validatePublishTransition("open", "open").valid, false);
  assert.equal(validatePublishTransition("open", "draft").valid, false);
});

test("getPublishedUrl constructs published RFQ link with slug", () => {
  const url = getPublishedUrl("steel-components");
  assert.equal(url, "/rfq/steel-components");
});

test("isRfqAcceptingQuotes returns true when RFQ is open and not expired", () => {
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const context = {
    rfqId: "rfq-123",
    rfqStatus: "open",
    rfqExpiresAt: futureDate,
  };

  assert.deepEqual(isRfqAcceptingQuotes(context), { accepting: true });
});

test("isRfqAcceptingQuotes preserves the in-review submission state", () => {
  assert.equal(
    isRfqAcceptingQuotes({ rfqId: "rfq-review", rfqStatus: "in_review" }).accepting,
    true,
  );
});

test("isRfqAcceptingQuotes rejects closed or expired RFQs", () => {
  const pastDate = new Date(Date.now() - 86400000).toISOString();

  assert.equal(isRfqAcceptingQuotes({ rfqId: "1", rfqStatus: "closed", rfqExpiresAt: pastDate }).accepting, false);
  assert.equal(isRfqAcceptingQuotes({ rfqId: "1", rfqStatus: "open", rfqExpiresAt: pastDate }).accepting, false);
});

test("validateResponderEligibility checks profile and product requirements", () => {
  const eligible = {
    rfqId: "1",
    rfqStatus: "open",
    responderHasProfile: true,
    responderHasProducts: true,
  };

  const ineligible = {
    rfqId: "1",
    rfqStatus: "open",
    responderHasProfile: false,
  };

  assert.equal(validateResponderEligibility(eligible).eligible, true);
  assert.equal(validateResponderEligibility(ineligible).eligible, false);
});

test("canProcessQuoteAction validates RFQ acceptance and responder eligibility", () => {
  const validContext = {
    rfqId: "rfq-123",
    rfqStatus: "open",
    rfqExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    responderHasProfile: true,
    responderHasProducts: true,
  };

  const expiredContext = {
    rfqId: "rfq-123",
    rfqStatus: "open",
    rfqExpiresAt: new Date(Date.now() - 86400000).toISOString(),
    responderHasProfile: true,
  };

  assert.equal(canProcessQuoteAction("draft", "submit", validContext).allowed, true);
  assert.equal(canProcessQuoteAction("submitted", "view", validContext).allowed, true);
  assert.equal(canProcessQuoteAction("draft", "submit", expiredContext).allowed, false);
});

test("normalizeQuoteOperationalState creates canonical operational context", () => {
  const context = normalizeQuoteOperationalState({
    rfqId: "rfq-123",
    rfqStatus: "open",
    rfqExpiresAt: "2026-02-01T00:00:00Z",
    responderVerified: true,
    responderHasProfile: true,
  });

  assert.equal(context.rfqId, "rfq-123");
  assert.equal(context.rfqStatus, "open");
  assert.equal(context.responderVerified, true);
});

test("getQuoteSubmissionDeadline returns RFQ closure or expiration date", () => {
  const closeDate = "2026-02-01T00:00:00Z";
  const context = {
    rfqId: "1",
    rfqStatus: "open",
    rfqClosedAt: closeDate,
  };

  const deadline = getQuoteSubmissionDeadline(context);
  assert.equal(deadline?.getTime(), new Date(closeDate).getTime());
});

test("canResumeProductDraft allows editing of draft products only", () => {
  assert.equal(canResumeProductDraft({ id: "1", status: "draft", deletedAt: null }), true);
  assert.equal(canResumeProductDraft({ id: "1", status: "rejected", deletedAt: null }), true);
  assert.equal(canResumeProductDraft({ id: "1", status: "draft", deletedAt: "2026-01-01" }), false);
  assert.equal(canResumeProductDraft({ id: "1", status: "published", deletedAt: null }), false);
});

test("canPublishProductDraft requires draft status and sufficient phase completion", () => {
  assert.equal(
    canPublishProductDraft({ id: "1", status: "draft", productName: "Steel", phase: 2, deletedAt: null }),
    true,
  );
  assert.equal(
    canPublishProductDraft({ id: "1", status: "rejected", productName: "Steel", phase: 2 }),
    true,
  );
  assert.equal(canPublishProductDraft({ id: "1", status: "draft", productName: "", phase: 2 }), false);
  assert.equal(canPublishProductDraft({ id: "1", status: "draft", productName: "Steel", phase: 1 }), false);
});

test("normalizeDraftProductState creates canonical draft state from product record", () => {
  const state = normalizeDraftProductState({
    id: "prod-123",
    status: "draft",
    productName: "Steel Beam",
    phase: 2,
    completionPercent: 50,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
  });

  assert.equal(state?.id, "prod-123");
  assert.equal(state?.status, "draft");
  assert.equal(state?.productName, "Steel Beam");
  assert.equal(state?.phase, 2);
  assert.equal(state?.canResume, true);
  assert.equal(state?.canPublish, true);
});

test("filterDraftProducts extracts draft products from mixed list", () => {
  const mixed = [
    { id: "1", status: "draft", deletedAt: null },
    { id: "2", status: "published", deletedAt: null },
    { id: "3", status: "rejected", deletedAt: null },
  ];

  const drafts = filterDraftProducts(mixed);
  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].id, "1");
  assert.equal(drafts[1].id, "3");
});

test("getProductResumeUrl constructs product edit link", () => {
  const url = getProductResumeUrl("prod-123");
  assert.equal(url, "/dashboard/seller/products/prod-123");
});

test("calculateProductCompletion weights all phases equally", () => {
  const completion = calculateProductCompletion({
    phase1Percent: 100,
    phase2Percent: 50,
    phase3Percent: 0,
  });

  assert.equal(completion, 63); // (100*0.25) + (50*0.25) + (0*0.25) + 25 = 62.5 ≈ 63
});

test("getCurrentProductPhase determines phase based on completion data", () => {
  const phase1 = getCurrentProductPhase({
    productName: undefined,
  });
  assert.equal(phase1, 1);

  const phase2 = getCurrentProductPhase({
    productName: "Steel",
    priceType: "fixed",
    description: undefined,
  });
  assert.equal(phase2, 2);

  const phase3 = getCurrentProductPhase({
    productName: "Steel",
    priceType: "fixed",
    description: "High quality steel",
    moq: "10 units",
    leadTime: "30 days",
  });
  assert.equal(phase3, 3);
});
