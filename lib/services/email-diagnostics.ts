/**
 * Email service configuration diagnostics and Resend error normalization.
 */

import { BRAND } from "@/config/brand";

export type EmailConfigSnapshot = {
  resendApiKeyConfigured: boolean;
  fromAddress: string;
  fromName: string;
  fromDomain: string;
};

export type EmailErrorCode =
  | "EMAIL_PROVIDER_REJECTED"
  | "EMAIL_FROM_INVALID"
  | "EMAIL_PROVIDER_UNAUTHORIZED"
  | "EMAIL_PROVIDER_RATE_LIMITED"
  | "EMAIL_PROVIDER_NETWORK"
  | "EMAIL_RECIPIENT_INVALID"
  | "EMAIL_NOT_CONFIGURED";

export function getEmailConfigSnapshot(): EmailConfigSnapshot {
  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS?.trim() || BRAND.noreplyEmail;
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || BRAND.name;
  const fromDomain = fromAddress.split("@")[1] ?? "";

  return {
    resendApiKeyConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    fromAddress,
    fromName,
    fromDomain,
  };
}

type ResendErrorBody = {
  statusCode?: number;
  name?: string;
  message?: string;
};

export function parseResendError(
  status: number,
  body: ResendErrorBody | null,
): { code: EmailErrorCode; message: string; hint: string } {
  const providerMessage =
    body?.message || body?.name || `Resend HTTP ${status}`;

  if (status === 401 || status === 403) {
    const testingOnly = providerMessage.toLowerCase().includes("testing");
    return {
      code: "EMAIL_PROVIDER_UNAUTHORIZED",
      message: testingOnly
        ? "Resend is in testing mode — emails can only go to your Resend account email until production sending is enabled."
        : "Resend rejected the API key or sender permissions.",
      hint: testingOnly
        ? "Resend Dashboard → Domains → verify customtolerance.com → enable production sending, or send to your Resend account email only."
        : "Verify RESEND_API_KEY in Vercel Production and redeploy after updating env vars.",
    };
  }

  if (status === 422) {
    const domainIssue =
      providerMessage.toLowerCase().includes("domain") ||
      providerMessage.toLowerCase().includes("from");
    return {
      code: domainIssue ? "EMAIL_FROM_INVALID" : "EMAIL_PROVIDER_REJECTED",
      message: domainIssue
        ? `Sender address is not authorized for Resend.`
        : providerMessage,
      hint: domainIssue
        ? `Set EMAIL_FROM_ADDRESS to an address on your verified domain (e.g. noreply@${BRAND.domain}) in Vercel Production.`
        : "Check recipient address and email payload in Vercel function logs.",
    };
  }

  if (status === 429) {
    return {
      code: "EMAIL_PROVIDER_RATE_LIMITED",
      message: "Email provider rate limit reached.",
      hint: "Wait a few minutes or upgrade Resend plan limits.",
    };
  }

  return {
    code: "EMAIL_PROVIDER_REJECTED",
    message: providerMessage,
    hint: "Check Vercel → Deployments → Functions → /api/admin/otp/send logs for the full Resend response.",
  };
}

export function userFacingEmailError(code: EmailErrorCode): string {
  switch (code) {
    case "EMAIL_FROM_INVALID":
      return "Email sender address is not authorized. Contact platform support.";
    case "EMAIL_PROVIDER_UNAUTHORIZED":
      return "Email provider rejected the request. API key or sending permissions need attention.";
    case "EMAIL_PROVIDER_RATE_LIMITED":
      return "Too many emails sent recently. Please wait and try again.";
    case "EMAIL_RECIPIENT_INVALID":
      return "Your account email address appears invalid for delivery.";
    case "EMAIL_NOT_CONFIGURED":
      return "Email delivery is not configured on the server.";
    default:
      return "Email provider could not deliver the verification code.";
  }
}
