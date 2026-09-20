-- =====================================================================
-- CustomTolerance — Razorpay Events Idempotency Table
-- =====================================================================
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query
--
-- Safe to run multiple times (fully idempotent).
-- Creates the razorpay_events table used by the webhook handler to
-- prevent duplicate event processing.
-- =====================================================================

-- 1. Create idempotency table
CREATE TABLE IF NOT EXISTS public.razorpay_events (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id       TEXT        NOT NULL,
  event_type     TEXT        NOT NULL,
  payload        JSONB,
  processed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT razorpay_events_event_id_unique UNIQUE (event_id)
);

-- 2. Indexes for fast idempotency lookups
CREATE INDEX IF NOT EXISTS idx_razorpay_events_event_id   ON public.razorpay_events (event_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_events_event_type ON public.razorpay_events (event_type);
CREATE INDEX IF NOT EXISTS idx_razorpay_events_created_at ON public.razorpay_events (created_at);

-- 3. Enable RLS — only service role can access webhook event records
ALTER TABLE public.razorpay_events ENABLE ROW LEVEL SECURITY;

-- Drop policy if it already exists (idempotent)
DROP POLICY IF EXISTS "razorpay_events_service_only" ON public.razorpay_events;

-- No public access — the webhook route uses a service-role client
CREATE POLICY "razorpay_events_service_only" ON public.razorpay_events
  FOR ALL USING (false);

-- 4. Grant to service_role
GRANT ALL ON public.razorpay_events TO service_role;

-- 5. Add event_id column if the table existed without it (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name    = 'razorpay_events'
    AND column_name   = 'event_id'
  ) THEN
    ALTER TABLE public.razorpay_events ADD COLUMN event_id TEXT;
    ALTER TABLE public.razorpay_events
      ADD CONSTRAINT razorpay_events_event_id_unique UNIQUE (event_id);
    CREATE INDEX idx_razorpay_events_event_id ON public.razorpay_events (event_id);
  END IF;
END $$;

COMMENT ON TABLE public.razorpay_events IS
  'Idempotency table for Razorpay webhook event processing. '
  'Prevents duplicate event handling. '
  'SECURITY: Only accessible via service_role — RLS blocks all direct access.';

-- =====================================================================
-- Verify: run this SELECT to confirm the table was created
-- SELECT table_name, row_security FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'razorpay_events';
-- =====================================================================
