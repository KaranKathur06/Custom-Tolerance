/**
 * CustomTolerance — Email Service
 *
 * Centralized email delivery via Resend HTTP API with structured diagnostics.
 */

import { BRAND } from "@/config/brand";
import {
  getEmailConfigSnapshot,
  parseResendError,
  type EmailErrorCode,
} from "@/lib/services/email-diagnostics";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: EmailErrorCode;
  hint?: string;
  providerStatus?: number;
  providerName?: string;
};

const emailFooter = `${BRAND.name} — ${BRAND.tagline}`;

function formatFromHeader(): string {
  const config = getEmailConfigSnapshot();
  return `${config.fromName} <${config.fromAddress}>`;
}

export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  const config = getEmailConfigSnapshot();

  if (!payload.to?.includes("@")) {
    return {
      success: false,
      code: "EMAIL_RECIPIENT_INVALID",
      error: "Invalid recipient email address.",
      hint: "Ensure the authenticated user has a valid email on their account.",
    };
  }

  if (!config.resendApiKeyConfigured) {
    console.log("[Email] Dev mode — RESEND_API_KEY not set");
    console.log(`[Email] To: ${payload.to} | Subject: ${payload.subject}`);
    console.log(`[Email] Body: ${payload.text || "(HTML only)"}`);
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  return sendViaResend(payload);
}

async function sendViaResend(payload: EmailPayload): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      code: "EMAIL_NOT_CONFIGURED",
      error: "RESEND_API_KEY is missing at runtime.",
      hint: "Add RESEND_API_KEY to Vercel Production and redeploy.",
    };
  }

  const from = formatFromHeader();

  try {
    console.log("[Email] Resend send attempt", {
      to: payload.to.replace(/(^.).+(@.+$)/, "$1***$2"),
      from,
      subject: payload.subject,
    });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    type ResendResponse = {
      id?: string;
      message?: string;
      name?: string;
      statusCode?: number;
    };

    let data: ResendResponse | null = null;
    try {
      data = (await response.json()) as ResendResponse;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const parsed = parseResendError(response.status, data);
      console.error("[Email] Resend rejected", {
        status: response.status,
        body: data,
        from,
        code: parsed.code,
      });
      return {
        success: false,
        error: parsed.message,
        code: parsed.code,
        hint: parsed.hint,
        providerStatus: response.status,
        providerName: data?.name,
      };
    }

    console.log("[Email] Resend accepted", { messageId: data?.id });
    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    console.error("[Email] Resend network failure:", message);
    return {
      success: false,
      code: "EMAIL_PROVIDER_NETWORK",
      error: message,
      hint: "Vercel function could not reach api.resend.com. Check network/firewall or retry.",
    };
  }
}

export function otpEmailTemplate(
  code: string,
  expiryMinutes: number,
): { subject: string; html: string; text: string } {
  return {
    subject: `${code} — Your ${BRAND.name} verification code`,
    text: `Your ${BRAND.name} verification code is: ${code}\n\nThis code expires in ${expiryMinutes} minutes.\n\nIf you didn't request this, please ignore this email.`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <tr>
      <td style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:24px 32px;text-align:center">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px">🔐 ${BRAND.name}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px">
        <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">
          Here&rsquo;s your verification code for admin access:
        </p>
        <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:8px;padding:20px;text-align:center;margin:0 0 16px">
          <span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#1e3a8a;font-family:monospace">${code}</span>
        </div>
        <p style="margin:0 0 8px;color:#94a3b8;font-size:12px">
          This code expires in <strong>${expiryMinutes} minutes</strong>.
        </p>
        <p style="margin:0;color:#94a3b8;font-size:12px">
          If you didn&rsquo;t request this code, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0">
        <p style="margin:0;color:#94a3b8;font-size:11px">${emailFooter}</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

export function verificationEmailTemplate(
  userName: string,
  status: "approved" | "rejected",
  notes?: string,
): { subject: string; html: string; text: string } {
  const isApproved = status === "approved";
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    `https://${BRAND.domain}`;
  return {
    subject: isApproved
      ? `✅ Your ${BRAND.name} seller account is verified!`
      : `⚠️ ${BRAND.name} verification update`,
    text: isApproved
      ? `Hi ${userName}, your seller account has been verified! You can now create listings on ${BRAND.name}.`
      : `Hi ${userName}, your seller verification needs attention. ${notes || "Please review and resubmit."}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <tr>
      <td style="background:linear-gradient(135deg,${isApproved ? "#16a34a,#22c55e" : "#f59e0b,#eab308"});padding:24px 32px;text-align:center">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">${isApproved ? "✅ Verified!" : "⚠️ Action Required"}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px">
        <p style="margin:0 0 16px;color:#1e293b;font-size:15px;font-weight:600">Hi ${userName},</p>
        <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">
          ${isApproved
            ? `Your seller account has been verified! You can now create product listings and connect with buyers on ${BRAND.name}.`
            : `Your seller verification needs attention. ${notes || "Please review your submission and update any missing information."}`}
        </p>
        <a href="${appUrl}/${isApproved ? "seller/dashboard" : "settings"}"
           style="display:inline-block;background:${isApproved ? "#1e3a8a" : "#f59e0b"};color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600">
          ${isApproved ? "Go to Dashboard →" : "Review Submission →"}
        </a>
      </td>
    </tr>
    <tr>
      <td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0">
        <p style="margin:0;color:#94a3b8;font-size:11px">${emailFooter}</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

export function suspensionEmailTemplate(
  userName: string,
  action: "suspend" | "unsuspend",
  reason?: string,
): { subject: string; html: string; text: string } {
  const isSuspended = action === "suspend";
  return {
    subject: isSuspended
      ? `🚫 Your ${BRAND.name} account has been suspended`
      : `✅ Your ${BRAND.name} account has been restored`,
    text: isSuspended
      ? `Hi ${userName}, your account has been suspended. ${reason || "Contact support for details."}`
      : `Hi ${userName}, your account has been restored. You can now access all features.`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <tr>
      <td style="background:${isSuspended ? "#dc2626" : "#16a34a"};padding:24px 32px;text-align:center">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">${isSuspended ? "🚫 Account Suspended" : "✅ Account Restored"}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px">
        <p style="margin:0 0 16px;color:#1e293b;font-size:15px;font-weight:600">Hi ${userName},</p>
        <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">
          ${isSuspended
            ? `Your ${BRAND.name} account has been suspended. ${reason ? `Reason: ${reason}` : ""} If you believe this is an error, please contact our support team.`
            : `Great news! Your ${BRAND.name} account has been restored. You can now access all marketplace features again.`}
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0">
        <p style="margin:0;color:#94a3b8;font-size:11px">${emailFooter}</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}
