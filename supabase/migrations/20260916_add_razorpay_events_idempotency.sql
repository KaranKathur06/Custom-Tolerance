-- ============================================
-- Migration: Add razorpay_events idempotency table
-- Purpose: Prevents duplicate processing of Razorpay webhook events
-- ============================================

-- Create the idempotency table for webhook events
CREATE TABLE IF NOT EXISTS public.razorpay_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT razorpay_events_event_id_unique UNIQUE (event_id)
);

-- Index for quick lookups during idempotency checks
CREATE INDEX IF NOT EXISTS idx_razorpay_events_event_id ON public.razorpay_events (event_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_events_event_type ON public.razorpay_events (event_type);
CREATE INDEX IF NOT EXISTS idx_razorpay_events_created_at ON public.razorpay_events (created_at);

-- RLS: Only service role can read/write webhook events
ALTER TABLE public.razorpay_events ENABLE ROW LEVEL SECURITY;

-- No public access — webhook route uses service role client
CREATE POLICY "razorpay_events_service_only" ON public.razorpay_events
  FOR ALL USING (false);

-- Grant access to service role
GRANT ALL ON public.razorpay_events TO service_role;

-- ============================================
-- Add event_id column to existing razorpay_events if table already exists
-- (idempotent — won't fail if column exists)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'razorpay_events'
    AND column_name = 'event_id'
  ) THEN
    ALTER TABLE public.razorpay_events ADD COLUMN event_id TEXT;
    ALTER TABLE public.razorpay_events ADD CONSTRAINT razorpay_events_event_id_unique UNIQUE (event_id);
    CREATE INDEX idx_razorpay_events_event_id ON public.razorpay_events (event_id);
  END IF;
END $$;

COMMENT ON TABLE public.razorpay_events IS 'Idempotency table for Razorpay webhook event processing. Prevents duplicate event handling.';
