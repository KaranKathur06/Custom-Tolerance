-- ═══════════════════════════════════════════════════════════
-- Migration: Email OTP Verification Security Layer
-- Complements Supabase native OTP (auth.users, email_confirmed_at)
-- Does NOT duplicate OTP generation — Supabase Auth owns tokens.
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Verification Attempts ───
-- Application-level brute-force protection per email + IP
CREATE TABLE IF NOT EXISTS verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_fingerprint TEXT,
  ip_address TEXT,
  failed_attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_attempts_email_active
  ON verification_attempts (lower(email))
  WHERE verified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_verification_attempts_ip
  ON verification_attempts (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_attempts_user
  ON verification_attempts (user_id);

-- ─── 2. OTP Events ───
-- Audit trail for OTP lifecycle (send, resend, verify, fail, expire)
CREATE TABLE IF NOT EXISTS otp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'otp_sent', 'otp_resent', 'otp_verified', 'otp_failed',
    'otp_expired', 'otp_locked', 'otp_resend_blocked'
  )),
  ip_address TEXT,
  user_agent TEXT,
  session_fingerprint TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_events_email
  ON otp_events (lower(email), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_events_type
  ON otp_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_events_user
  ON otp_events (user_id);

-- ─── 3. Security Logs ───
-- General auth security events (signup, verification, lockouts)
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  session_fingerprint TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_email
  ON security_logs (lower(email), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_logs_event
  ON security_logs (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_logs_severity
  ON security_logs (severity, created_at DESC);

-- ─── 4. Resend Cooldown Tracking ───
-- Per-email last OTP send timestamp (60s resend protection)
CREATE TABLE IF NOT EXISTS otp_resend_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  send_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_otp_resend_cooldowns_email
  ON otp_resend_cooldowns (lower(email));

-- ─── 5. RLS ───
ALTER TABLE verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_resend_cooldowns ENABLE ROW LEVEL SECURITY;

-- Service role / API routes write; no public read
DROP POLICY IF EXISTS verification_attempts_service ON verification_attempts;
CREATE POLICY verification_attempts_service ON verification_attempts
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS otp_events_service ON otp_events;
CREATE POLICY otp_events_service ON otp_events
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS security_logs_service ON security_logs;
CREATE POLICY security_logs_service ON security_logs
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS otp_resend_cooldowns_service ON otp_resend_cooldowns;
CREATE POLICY otp_resend_cooldowns_service ON otp_resend_cooldowns
  FOR ALL USING (true) WITH CHECK (true);

-- ─── 6. Cleanup function ───
CREATE OR REPLACE FUNCTION cleanup_verification_security_data()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_attempts
  WHERE verified_at IS NOT NULL AND verified_at < now() - interval '7 days';

  DELETE FROM verification_attempts
  WHERE locked_until IS NOT NULL AND locked_until < now() - interval '24 hours'
    AND verified_at IS NULL;

  DELETE FROM otp_events WHERE created_at < now() - interval '90 days';
  DELETE FROM security_logs WHERE created_at < now() - interval '180 days';
  DELETE FROM otp_resend_cooldowns WHERE updated_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
