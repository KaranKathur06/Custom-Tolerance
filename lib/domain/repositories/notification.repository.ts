import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationRecord = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown>;
};

export class NotificationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(input: {
    userId: string;
    type: string;
    title: string;
    body?: string | null;
    href?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<NotificationRecord> {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
        metadata: input.metadata ?? {},
      })
      .select('id, user_id, type, title, body, href, metadata')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create notification');
    }

    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      body: data.body,
      href: data.href,
      metadata: data.metadata,
    };
  }
}
