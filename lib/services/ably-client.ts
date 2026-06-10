/**
 * Ably realtime — gated off until configured.
 * Set ABLY_API_KEY + NEXT_PUBLIC_ABLY_CLIENT_KEY and NEXT_PUBLIC_ENABLE_ABLY=true.
 */

export function isAblyEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_ABLY === "true" &&
    Boolean(process.env.ABLY_API_KEY?.trim())
  );
}

export async function publishRealtimeEvent(
  eventName: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!isAblyEnabled()) {
    throw new Error(
      "Ably is not configured. Set ABLY_API_KEY and NEXT_PUBLIC_ENABLE_ABLY=true",
    );
  }

  const channel = channelForEvent(eventName);
  const response = await fetch(`https://rest.ably.io/channels/${encodeURIComponent(channel)}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(process.env.ABLY_API_KEY!).toString("base64")}`,
    },
    body: JSON.stringify({
      name: eventName,
      data: payload,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ably publish failed (${response.status}): ${text.slice(0, 200)}`);
  }
}

function channelForEvent(eventName: string): string {
  if (eventName.startsWith("quote.")) return "quotes";
  if (eventName.startsWith("rfq.")) return "rfqs";
  if (eventName.startsWith("inquiry.")) return "inquiries";
  if (eventName.startsWith("message.")) return "messages";
  return "platform";
}
