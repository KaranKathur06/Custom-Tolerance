export type QuoteLifecycleStatus =
  | "draft"
  | "submitted"
  | "viewed"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";

export type QuoteLifecycleAction =
  | "edit"
  | "submit"
  | "withdraw"
  | "view"
  | "accept"
  | "reject"
  | "shortlist";

export function canTransitionQuoteLifecycle(
  status: QuoteLifecycleStatus,
  action: QuoteLifecycleAction,
): boolean {
  const transitions: Record<QuoteLifecycleStatus, QuoteLifecycleAction[]> = {
    draft: ["edit", "submit", "withdraw"],
    submitted: ["withdraw", "view", "shortlist", "accept", "reject"],
    viewed: ["withdraw", "shortlist", "accept", "reject"],
    shortlisted: ["accept", "reject", "withdraw"],
    accepted: [],
    rejected: [],
    withdrawn: [],
    expired: [],
  };

  return transitions[status]?.includes(action) ?? false;
}
