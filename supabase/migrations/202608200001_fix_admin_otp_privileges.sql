-- Admin OTP persistence is server-only security state.
-- Keep the grants explicit because older production projects may not have
-- inherited schema/table privileges from the original RBAC migration.

GRANT USAGE ON SCHEMA public TO service_role, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.otp_verifications, public.admin_sessions, public.admin_audit_logs, public.rate_limits
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.otp_verifications, public.admin_sessions, public.rate_limits
TO authenticated;

GRANT INSERT ON TABLE public.admin_audit_logs TO authenticated;