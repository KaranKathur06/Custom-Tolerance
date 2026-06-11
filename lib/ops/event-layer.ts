'use client';

export type OpsEventName =
  | 'user.role_changed'
  | 'user.status_changed'
  | 'user.verification_changed'
  | 'user.notification_sent'
  | 'moderation.item_resolved'
  | 'settings.updated';

export type OpsEventPayload = {
  entityId?: string;
  entityLabel?: string;
  message: string;
  metadata?: Record<string, string | number | boolean>;
};

export const OPS_EVENT_NAME = 'customtolerance:ops-event';

export function publishOpsEvent(name: OpsEventName, payload: OpsEventPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPS_EVENT_NAME, {
    detail: {
      name,
      payload,
      occurredAt: new Date().toISOString(),
    },
  }));
}
