/**
 * Platform event bus — persists to Supabase `platform_events` and optionally
 * fans out to WhatsApp, Typesense, and Ably when those services are enabled.
 *
 * External fan-out stays off until feature flags + credentials are configured.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isAblyEnabled, publishRealtimeEvent } from "@/lib/services/ably-client";
import { isTypesenseEnabled, syncResourceToTypesense } from "@/lib/services/typesense-client";
import { isWhatsAppEnabled, sendWhatsAppTemplate } from "@/lib/services/whatsapp-client";

export type PlatformEventInput = {
  eventType: string;
  actorId?: string | null;
  actorRole?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
};

export type PublishResult = {
  persisted: boolean;
  whatsapp: "skipped" | "sent" | "failed";
  typesense: "skipped" | "synced" | "failed";
  ably: "skipped" | "published" | "failed";
};

export async function publishPlatformEvent(
  supabase: SupabaseClient,
  input: PlatformEventInput,
): Promise<PublishResult> {
  const result: PublishResult = {
    persisted: false,
    whatsapp: "skipped",
    typesense: "skipped",
    ably: "skipped",
  };

  const { error } = await supabase.from("platform_events").insert({
    event_type: input.eventType,
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole ?? null,
    resource_type: input.resourceType ?? null,
    resource_id: input.resourceId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to persist platform event: ${error.message}`);
  }
  result.persisted = true;

  await Promise.allSettled([
    fanOutWhatsApp(input, result),
    fanOutTypesense(input, result),
    fanOutAbly(input, result),
  ]);

  return result;
}

async function fanOutWhatsApp(input: PlatformEventInput, result: PublishResult) {
  if (!isWhatsAppEnabled()) return;

  const template = whatsAppTemplateForEvent(input.eventType);
  if (!template) return;

  const phone = typeof input.metadata?.phone === "string" ? input.metadata.phone : null;
  if (!phone) return;

  try {
    await sendWhatsAppTemplate({ to: phone, templateName: template, params: input.metadata ?? {} });
    result.whatsapp = "sent";
  } catch {
    result.whatsapp = "failed";
  }
}

async function fanOutTypesense(input: PlatformEventInput, result: PublishResult) {
  if (!isTypesenseEnabled() || !input.resourceType || !input.resourceId) return;

  try {
    await syncResourceToTypesense(input.resourceType, input.resourceId, input.eventType);
    result.typesense = "synced";
  } catch {
    result.typesense = "failed";
  }
}

async function fanOutAbly(input: PlatformEventInput, result: PublishResult) {
  if (!isAblyEnabled()) return;

  try {
    await publishRealtimeEvent(input.eventType, {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
    });
    result.ably = "published";
  } catch {
    result.ably = "failed";
  }
}

function whatsAppTemplateForEvent(eventType: string): string | null {
  const map: Record<string, string> = {
    "rfq.created": "rfq_posted",
    "quote.submitted": "quote_received",
    "quote.accepted": "quote_accepted",
    "inquiry.received": "new_inquiry",
  };
  return map[eventType] ?? null;
}
