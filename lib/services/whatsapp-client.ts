/**
 * WhatsApp client — Gupshup or Twilio, gated off until configured.
 * Set WHATSAPP_PROVIDER + credentials and NEXT_PUBLIC_ENABLE_WHATSAPP=true.
 */

export type WhatsAppTemplatePayload = {
  to: string;
  templateName: string;
  params?: Record<string, unknown>;
};

export function isWhatsAppEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_WHATSAPP !== "true") return false;

  const provider = process.env.WHATSAPP_PROVIDER ?? "gupshup";
  if (provider === "gupshup") {
    return Boolean(process.env.GUPSHUP_API_KEY?.trim() && process.env.GUPSHUP_APP_NAME?.trim());
  }
  if (provider === "twilio") {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.TWILIO_WHATSAPP_FROM?.trim(),
    );
  }
  return false;
}

export async function sendWhatsAppTemplate(payload: WhatsAppTemplatePayload): Promise<void> {
  if (!isWhatsAppEnabled()) {
    throw new Error(
      "WhatsApp is not configured. Set provider credentials and NEXT_PUBLIC_ENABLE_WHATSAPP=true",
    );
  }

  const provider = process.env.WHATSAPP_PROVIDER ?? "gupshup";
  const to = normalizePhone(payload.to);

  if (provider === "gupshup") {
    await sendViaGupshup(to, payload);
    return;
  }

  await sendViaTwilio(to, payload);
}

async function sendViaGupshup(to: string, payload: WhatsAppTemplatePayload): Promise<void> {
  const response = await fetch("https://api.gupshup.io/sm/api/v1/template/msg", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: process.env.GUPSHUP_API_KEY!,
    },
    body: new URLSearchParams({
      channel: "whatsapp",
      source: process.env.GUPSHUP_APP_NAME!,
      destination: to,
      template: JSON.stringify({
        id: payload.templateName,
        params: Object.values(payload.params ?? {}),
      }),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gupshup send failed (${response.status}): ${text.slice(0, 200)}`);
  }
}

async function sendViaTwilio(to: string, payload: WhatsAppTemplatePayload): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const from = process.env.TWILIO_WHATSAPP_FROM!;

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: from,
      To: `whatsapp:${to}`,
      Body: `[${payload.templateName}] ${JSON.stringify(payload.params ?? {})}`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio send failed (${response.status}): ${text.slice(0, 200)}`);
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}
