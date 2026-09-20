/**
 * Central Email Service — CustomTolerance Transactional Email
 *
 * All transactional emails MUST go through this service.
 * Ensures:
 * - CustomTolerance branding on all emails (never shows "Supabase" to end users)
 * - Proper sender identity (no-reply@customtolerance.com)
 * - Email delivery logging
 * - Error handling without exposing SMTP internals
 *
 * Provider priority:
 * 1. Resend (RESEND_API_KEY)
 * 2. Nodemailer SMTP (SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS)
 * 3. Console fallback (development only — logs to server console)
 */

import { BRAND } from "@/config/brand";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: string[];
};

export type EmailResult = {
  success: boolean;
  provider: "resend" | "smtp" | "console";
  messageId?: string;
  error?: string;
};

function getFromAddress(): string {
  return process.env.EMAIL_FROM_ADDRESS || `noreply@customtolerance.com`;
}

function getFromName(): string {
  return process.env.EMAIL_FROM_NAME || BRAND.name;
}

function getReplyTo(): string {
  return process.env.EMAIL_REPLY_TO || `support@customtolerance.com`;
}

/**
 * Send an email through the configured provider.
 * Never expose provider errors to the client.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const from = `${getFromName()} <${getFromAddress()}>`;
  const replyTo = payload.replyTo || getReplyTo();

  // ── 1. Try Resend ──
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          reply_to: replyTo,
          tags: payload.tags?.map((t) => ({ name: t, value: "true" })),
        }),
      });

      const data = await response.json();

      if (response.ok && data.id) {
        return {
          success: true,
          provider: "resend",
          messageId: data.id,
        };
      }

      console.error("[EmailService] Resend error:", data);
      return {
        success: false,
        provider: "resend",
        error: "Email delivery failed",
      };
    } catch (err) {
      console.error("[EmailService] Resend exception:", err);
      return {
        success: false,
        provider: "resend",
        error: "Email service unavailable",
      };
    }
  }

  // ── 2. Try Nodemailer SMTP ──
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || "587", 10),
        secure: smtpPort === "465",
        auth: { user: smtpUser, pass: smtpPass },
      });

      const info = await transport.sendMail({
        from,
        to: payload.to,
        replyTo,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      return {
        success: true,
        provider: "smtp",
        messageId: info.messageId,
      };
    } catch (err) {
      console.error("[EmailService] SMTP exception:", err);
      return {
        success: false,
        provider: "smtp",
        error: "Email delivery failed",
      };
    }
  }

  // ── 3. Console fallback (development only) ──
  if (process.env.NODE_ENV !== "production") {
    console.log("\n══════════════════════════════════════════");
    console.log(`[EmailService] CONSOLE FALLBACK (no provider configured)`);
    console.log(`  To: ${payload.to}`);
    console.log(`  Subject: ${payload.subject}`);
    console.log(`  From: ${from}`);
    if (payload.text) {
      console.log(`  Body:\n${payload.text.slice(0, 500)}`);
    }
    console.log("══════════════════════════════════════════\n");

    return {
      success: true,
      provider: "console",
      messageId: `dev-${Date.now()}`,
    };
  }

  // Production with no provider = failure
  console.error(
    "[EmailService] No email provider configured in production. " +
    "Set RESEND_API_KEY or SMTP_HOST+SMTP_USER+SMTP_PASS.",
  );

  return {
    success: false,
    provider: "console",
    error: "Email service not configured",
  };
}

/**
 * Send a branded transactional email using the template system.
 */
export async function sendBrandedEmail(params: {
  to: string;
  templateKey: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    tags: [params.templateKey],
  });
}
