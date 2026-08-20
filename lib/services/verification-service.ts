export type VerificationCheckStatus = "verified" | "missing" | "pending";

export type VerificationItem = {
  key: string;
  label: string;
  status: VerificationCheckStatus;
  required: boolean;
};

export type VerificationState = {
  overallStatus: "verified" | "partially_verified" | "unverified";
  missing: string[];
  items: {
    email: VerificationItem;
    mobile: VerificationItem;
    identity: VerificationItem;
    business: VerificationItem;
    gst: VerificationItem;
    profile: VerificationItem;
    documents: VerificationItem;
  };
};

export function normalizeVerificationState(input: {
  emailVerified?: boolean;
  mobileVerified?: boolean;
  profileCompletionPercent?: number | null;
  documentCount?: number;
  requiredDocumentCount?: number;
  approvedDocumentCount?: number;
}): VerificationState {
  const emailVerified = Boolean(input.emailVerified);
  const mobileVerified = Boolean(input.mobileVerified);
  const profileCompletionPercent = Number(input.profileCompletionPercent ?? 0);
  const requiredDocumentCount = Number(input.requiredDocumentCount ?? input.documentCount ?? 0);
  const approvedDocumentCount = Number(input.approvedDocumentCount ?? input.documentCount ?? 0);

  const items = {
    email: {
      key: "email",
      label: "Email verification",
      status: emailVerified ? "verified" : "missing",
      required: true,
    },
    mobile: {
      key: "mobile",
      label: "Mobile verification",
      status: mobileVerified ? "verified" : "missing",
      required: true,
    },
    identity: {
      key: "identity",
      label: "Identity verification",
      status: "pending",
      required: false,
    },
    business: {
      key: "business",
      label: "Business verification",
      status: "pending",
      required: false,
    },
    gst: {
      key: "gst",
      label: "GST verification",
      status: requiredDocumentCount > 0 && approvedDocumentCount >= requiredDocumentCount ? "verified" : "missing",
      required: requiredDocumentCount > 0,
    },
    profile: {
      key: "profile",
      label: "Profile completion",
      status: profileCompletionPercent >= 40 ? "verified" : "missing",
      required: true,
    },
    documents: {
      key: "documents",
      label: "Document verification",
      status: requiredDocumentCount > 0 && approvedDocumentCount >= requiredDocumentCount ? "verified" : "missing",
      required: requiredDocumentCount > 0,
    },
  };

  const missing = Object.values(items)
    .filter((item) => item.status === "missing")
    .map((item) => item.key)
    .filter((key) => key === "email" || key === "mobile" || key === "profile" || key === "gst" || key === "documents");

  const overallStatus: VerificationState["overallStatus"] = missing.length === 0
    ? "verified"
    : missing.includes("email") && missing.includes("mobile")
      ? "unverified"
      : "partially_verified";

  return {
    overallStatus,
    missing,
    items,
  };
}

export function getVerificationState(input: Parameters<typeof normalizeVerificationState>[0]): VerificationState {
  return normalizeVerificationState(input);
}
