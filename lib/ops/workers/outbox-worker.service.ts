import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

/**
 * OutboxWorkerService
 * Processes pending outbox events and dispatches them to respective projection builders,
 * notification services, search indexers, etc.
 */
export class OutboxWorkerService {
  static async processPendingEvents() {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) throw new Error("Supabase client not initialized");

    // 1. Fetch pending events
    const { data: events, error } = await supabase
      .from('outbox_events')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error("Error fetching outbox events:", error);
      return;
    }

    if (!events || events.length === 0) {
      return;
    }

    for (const event of events) {
      try {
        // 2. Mark as processing
        await supabase
          .from('outbox_events')
          .update({ status: 'PROCESSING' })
          .eq('id', event.id);

        // 3. Process the event based on type
        await this.handleEvent(event);

        // 4. Mark as completed
        await supabase
          .from('outbox_events')
          .update({ 
            status: 'COMPLETED',
            processed_at: new Date().toISOString()
          })
          .eq('id', event.id);

      } catch (err: any) {
        console.error(`Failed to process event ${event.id}:`, err);
        // Mark as failed
        await supabase
          .from('outbox_events')
          .update({ 
            status: 'FAILED',
            error_details: err.message
          })
          .eq('id', event.id);
      }
    }
  }

  private static async handleEvent(event: any) {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) return;

    switch (event.event_type) {
      case 'PRODUCT_APPROVED':
        // e.g., Update Search Index, Update Seller Stats
        break;
      
      case 'RFQ_SUBMITTED':
        // e.g., Notify matching suppliers, update CRM lead status
        break;

      case 'SUPPORT_TICKET_CREATED':
        // e.g., Notify admin, update support KPI projection
        break;

      // Add other event handlers here...
      default:
        console.log(`Unhandled event type: ${event.event_type}`);
    }
  }
}
