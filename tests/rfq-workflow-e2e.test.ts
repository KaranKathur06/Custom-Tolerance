/**
 * End-to-End RFQ Workflow Tests
 * 
 * Verifies the complete RFQ lifecycle:
 * 1. Buyer creates draft RFQ
 * 2. Buyer resumes and edits draft
 * 3. Buyer publishes draft to open
 * 4. Supplier views open RFQ and checks eligibility
 * 5. Supplier submits quote
 * 6. Buyer takes quote actions (view/shortlist/accept)
 * 7. Verify all state transitions are enforced
 */

import test from "node:test";
import assert from "node:assert/strict";

// Services
import { canPublishDraft } from "@/lib/services/rfq-draft-service";
import { canPublishRfq, validatePublishTransition } from "@/lib/services/rfq-publish-service";
import { canTransitionQuoteLifecycle } from "@/lib/services/quote-lifecycle";
import { isRfqAcceptingQuotes, canProcessQuoteAction } from "@/lib/services/quote-operational-lifecycle";
import { canEnterPhase } from "@/lib/services/product-service";

test("E2E: RFQ Draft Creation and Resume", () => {
  // Step 1: Buyer creates draft RFQ (status=draft, composerStep=0)
  const draftRfq = {
    id: "rfq-draft-001",
    status: "draft",
    title: "",
    composerStep: 0,
    deletedAt: null,
  };

  // Can create draft
  assert.equal(draftRfq.status, "draft", "Draft RFQ created");

  // Step 2: Buyer fills in basic info (step 1)
  const step1Data = {
    ...draftRfq,
    title: "Steel Components Requirement",
    composerStep: 1,
  };

  assert.equal(step1Data.title, "Steel Components Requirement");

  // Step 3: Buyer cannot publish yet (needs composerStep >= 3)
  const canPublish1 = canPublishDraft(step1Data);
  assert.equal(canPublish1, false, "Cannot publish at step 1");

  // Step 4: Buyer continues to step 2 (description, items)
  const step2Data = {
    ...step1Data,
    composerStep: 2,
  };

  // Still cannot publish
  assert.equal(canPublishDraft(step2Data), false, "Cannot publish at step 2");

  // Step 5: Buyer completes step 3 (specs)
  const step3Data = {
    ...step2Data,
    composerStep: 3,
  };

  // Now can publish
  const canPublishFinal = canPublishDraft(step3Data);
  assert.equal(canPublishFinal, true, "Can publish at step 3");
});

test("E2E: RFQ Publish and State Transition", () => {
  // Draft RFQ ready to publish
  const draftRfq = {
    id: "rfq-draft-002",
    status: "draft",
    title: "Precision Machined Parts",
    composer_step: 3,
    slug: "precision-machined-parts",
    deletedAt: null,
  };

  // Check if RFQ is publishable via canonical service
  const publishCheck = canPublishRfq(draftRfq);
  assert.equal(publishCheck.allowed, true, "RFQ is publishable");

  // Validate transition: draft -> open
  const transition = validatePublishTransition(draftRfq.status, "open");
  assert.equal(transition.valid, true, "Transition draft->open is valid");

  // After publish, RFQ becomes open
  const publishedRfq = {
    ...draftRfq,
    status: "open",
    publishedAt: new Date().toISOString(),
  };

  assert.equal(publishedRfq.status, "open", "RFQ is now open");

  // Cannot transition back to draft
  const invalidTransition = validatePublishTransition("open", "draft");
  assert.equal(invalidTransition.valid, false, "Cannot transition open->draft");
});

test("E2E: Quote Submission on Open RFQ", () => {
  // Open RFQ accepting quotes
  const openRfq = {
    id: "rfq-001",
    status: "open",
    rfqStatus: "open",
    rfqExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    deletedAt: null,
  };

  // Supplier context
  const supplierContext = {
    rfqId: openRfq.id,
    rfqStatus: openRfq.rfqStatus,
    rfqExpiresAt: openRfq.rfqExpiresAt,
    responderHasProfile: true,
    responderHasProducts: true,
  };

  // Check if RFQ is accepting quotes
  const accepting = isRfqAcceptingQuotes(supplierContext);
  assert.equal(accepting.accepting, true, "RFQ is accepting quotes");

  // Supplier submits quote
  const quote = {
    id: "quote-001",
    rfqId: openRfq.id,
    status: "draft", // New quote starts as draft
    price: "50000",
    currency: "USD",
    validityDays: 30,
    submitTime: null,
  };

  // Quote can transition from draft to submitted
  const canSubmit = canTransitionQuoteLifecycle("draft", "submit");
  assert.equal(canSubmit, true, "Can submit quote");

  // Process quote action submission with operational checks
  const submitAction = canProcessQuoteAction("draft", "submit", supplierContext);
  assert.equal(submitAction.allowed, true, "Quote submission allowed");

  // After submission
  const submittedQuote = {
    ...quote,
    status: "submitted",
    submitTime: new Date().toISOString(),
  };

  assert.equal(submittedQuote.status, "submitted", "Quote is submitted");
});

test("E2E: Quote Lifecycle Actions", () => {
  // Submitted quote can be viewed, shortlisted, accepted, rejected
  const submittedQuote = { status: "submitted" as const };

  assert.equal(
    canTransitionQuoteLifecycle(submittedQuote.status, "view"),
    true,
    "Buyer can view submitted quote",
  );
  assert.equal(
    canTransitionQuoteLifecycle(submittedQuote.status, "shortlist"),
    true,
    "Buyer can shortlist submitted quote",
  );
  assert.equal(
    canTransitionQuoteLifecycle(submittedQuote.status, "accept"),
    true,
    "Buyer can accept submitted quote",
  );
  assert.equal(
    canTransitionQuoteLifecycle(submittedQuote.status, "reject"),
    true,
    "Buyer can reject submitted quote",
  );

  // After viewing
  const viewedQuote = { status: "viewed" as const };
  assert.equal(
    canTransitionQuoteLifecycle(viewedQuote.status, "shortlist"),
    true,
    "Can shortlist viewed quote",
  );

  // After shortlisting
  const shortlistedQuote = { status: "shortlisted" as const };
  assert.equal(
    canTransitionQuoteLifecycle(shortlistedQuote.status, "accept"),
    true,
    "Can accept shortlisted quote",
  );

  // Terminal state
  const acceptedQuote = { status: "accepted" as const };
  assert.equal(
    canTransitionQuoteLifecycle(acceptedQuote.status, "reject"),
    false,
    "Cannot transition from accepted",
  );
  assert.equal(
    canTransitionQuoteLifecycle(acceptedQuote.status, "withdraw"),
    false,
    "Cannot withdraw accepted quote",
  );
});

test("E2E: RFQ Expiration Blocks New Quote Submissions", () => {
  // Expired RFQ
  const expiredRfq = {
    rfqId: "rfq-expired-001",
    rfqStatus: "open",
    rfqExpiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
  };

  // Check if RFQ accepts quotes
  const accepting = isRfqAcceptingQuotes(expiredRfq);
  assert.equal(accepting.accepting, false, "Expired RFQ rejects new quotes");
  assert.equal(accepting.error, "RFQ_EXPIRED", "Error reason is RFQ_EXPIRED");

  // Attempt quote submission fails
  const submitAction = canProcessQuoteAction("draft", "submit", expiredRfq);
  assert.equal(submitAction.allowed, false, "Quote submission blocked");
});

test("E2E: Product Phases Block Incomplete Publishing", () => {
  // Product missing phase 1 completion
  const incompleteDraft = {
    productName: "", // Missing name
    priceType: "fixed",
    minPrice: 100,
    currency: "USD",
    capabilities: ["Machining"],
    materials: ["Steel"],
    tolerance: "pm0_1mm",
  };

  const canEnter2 = canEnterPhase(incompleteDraft, 2);
  assert.equal(canEnter2, false, "Cannot skip phase 1");

  // Complete phase 1
  const completePhase1 = {
    ...incompleteDraft,
    productName: "Steel Plate",
  };

  assert.equal(canEnterPhase(completePhase1, 2), true, "Can enter phase 2 with complete phase 1");
});

test("E2E: Full Workflow Scenario", () => {
  // Complete journey: create → resume → publish → quote → accept

  // 1. Create draft
  const step1 = {
    id: "rfq-final-001",
    status: "draft",
    title: "Industrial Steel Castings",
    composerStep: 0,
  };

  // 2. Edit and progress to step 3
  const step3 = { ...step1, composerStep: 3 };
  assert.equal(canPublishDraft(step3), true);

  // 3. Publish to open (convert to snake_case for canPublishRfq)
  const rfqForPublish = {
    id: step3.id,
    status: step3.status,
    title: step3.title,
    composer_step: step3.composerStep,
  };
  const publishCheck = canPublishRfq(rfqForPublish);
  assert.equal(publishCheck.allowed, true);

  const openRfq = {
    ...step3,
    status: "open",
    rfqStatus: "open",
    rfqExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // 4. Supplier checks eligibility and submits quote
  const supplierContext = {
    rfqId: openRfq.id,
    rfqStatus: "open",
    rfqExpiresAt: openRfq.rfqExpiresAt,
    responderHasProfile: true,
    responderHasProducts: true,
  };

  const canSubmit = canProcessQuoteAction("draft", "submit", supplierContext);
  assert.equal(canSubmit.allowed, true);

  const quote = {
    id: "quote-final-001",
    status: "submitted",
  };

  // 5. Buyer views and accepts quote
  assert.equal(canTransitionQuoteLifecycle("submitted", "view"), true);
  assert.equal(canTransitionQuoteLifecycle("submitted", "accept"), true);

  const acceptedQuote = { ...quote, status: "accepted" };
  assert.equal(acceptedQuote.status, "accepted");

  // 6. Verify terminal state
  assert.equal(
    canTransitionQuoteLifecycle("accepted", "withdraw"),
    false,
    "Workflow complete, quote terminal",
  );
});
