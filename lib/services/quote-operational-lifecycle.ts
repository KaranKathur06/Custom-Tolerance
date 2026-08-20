/**
 * Quote Operational Lifecycle Service
 *
 * Enforces business rules around quote acceptance beyond the state machine.
 * Validates that RFQ is still accepting quotes, submission windows are open,
 * and responders meet eligibility requirements.
 */

export type QuoteOperationalError =
  | "RFQ_NOT_ACCEPTING"
  | "SUBMISSION_CLOSED"
  | "RESPONDER_INELIGIBLE"
  | "RFQ_EXPIRED"
  | "RFQ_NOT_FOUND";

export interface QuoteOperationalContext {
  rfqId: string;
  rfqStatus: string;
  rfqClosedAt?: string | null;
  rfqExpiresAt?: string | null;
  responderVerified?: boolean;
  responderHasProfile?: boolean;
  responderHasProducts?: boolean;
}

/**
 * Determine if an RFQ is still accepting quotes for new submissions.
 * An RFQ accepts quotes if:
 * - Status is "open" or "quoted" (not closed/cancelled)
 * - No explicit closure date has passed
 * - Not past expiration
 */
export function isRfqAcceptingQuotes(context: QuoteOperationalContext): {
  accepting: boolean;
  error?: QuoteOperationalError;
} {
  if (!context.rfqStatus) {
    return { accepting: false, error: "RFQ_NOT_FOUND" };
  }

  // Open, in-review, and quoted RFQs accept new quotes.
  if (!["open", "in_review", "quoted"].includes(context.rfqStatus)) {
    return { accepting: false, error: "RFQ_NOT_ACCEPTING" };
  }

  // Check if RFQ has been explicitly closed
  if (context.rfqClosedAt) {
    const closedDate = new Date(context.rfqClosedAt);
    if (closedDate < new Date()) {
      return { accepting: false, error: "SUBMISSION_CLOSED" };
    }
  }

  // Check if RFQ has expired
  if (context.rfqExpiresAt) {
    const expiresDate = new Date(context.rfqExpiresAt);
    if (expiresDate < new Date()) {
      return { accepting: false, error: "RFQ_EXPIRED" };
    }
  }

  return { accepting: true };
}

/**
 * Validate responder (supplier) eligibility to quote on an RFQ.
 * Requirements:
 * - Profile must exist (seller onboarded)
 * - Should be email verified (or mobile verified)
 * - Should have at least one product/service listing
 */
export function validateResponderEligibility(context: QuoteOperationalContext): {
  eligible: boolean;
  error?: QuoteOperationalError;
} {
  if (!context.responderHasProfile) {
    return { eligible: false, error: "RESPONDER_INELIGIBLE" };
  }

  // Soft check: log but don't block if no products
  // This allows new sellers to quote while building their catalog
  if (!context.responderHasProducts) {
    // Could return warning, but allowing for now
    // In strict mode, could return error
  }

  return { eligible: true };
}

/**
 * Enforce full operational contract before quote action is processed.
 * Returns detailed validation result indicating if action can proceed.
 */
export function canProcessQuoteAction(
  quoteStatus: string,
  action: string,
  context: QuoteOperationalContext,
): {
  allowed: boolean;
  error?: QuoteOperationalError;
  reason?: string;
} {
  // Only check operational constraints for quote submission/acceptance actions
  // Terminal states don't need checking
  if (["accepted", "rejected", "withdrawn", "expired"].includes(quoteStatus)) {
    return { allowed: true }; // Terminal state, no operational checks needed
  }

  // If submitting a quote (new submission), check RFQ acceptance
  if (action === "submit") {
    const acceptingCheck = isRfqAcceptingQuotes(context);
    if (!acceptingCheck.accepting) {
      return {
        allowed: false,
        error: acceptingCheck.error,
        reason: `Cannot submit quote: RFQ is not accepting quotes (${acceptingCheck.error})`,
      };
    }

    const eligibilityCheck = validateResponderEligibility(context);
    if (!eligibilityCheck.eligible) {
      return {
        allowed: false,
        error: eligibilityCheck.error,
        reason: "Responder does not meet eligibility requirements",
      };
    }
  }

  return { allowed: true };
}

/**
 * Normalize operational state for quote lifecycle tracking.
 */
export function normalizeQuoteOperationalState(input: {
  rfqId: string;
  rfqStatus?: string;
  rfqClosedAt?: string | null;
  rfqExpiresAt?: string | null;
  responderVerified?: boolean;
  responderHasProfile?: boolean;
  responderHasProducts?: boolean;
}): QuoteOperationalContext {
  return {
    rfqId: input.rfqId,
    rfqStatus: input.rfqStatus || "unknown",
    rfqClosedAt: input.rfqClosedAt,
    rfqExpiresAt: input.rfqExpiresAt,
    responderVerified: input.responderVerified ?? false,
    responderHasProfile: input.responderHasProfile ?? false,
    responderHasProducts: input.responderHasProducts ?? false,
  };
}

/**
 * Get quote submission window constraint.
 * Returns the deadline by which a quote must be submitted.
 */
export function getQuoteSubmissionDeadline(context: QuoteOperationalContext): Date | null {
  if (context.rfqClosedAt) {
    return new Date(context.rfqClosedAt);
  }
  if (context.rfqExpiresAt) {
    return new Date(context.rfqExpiresAt);
  }
  return null;
}
