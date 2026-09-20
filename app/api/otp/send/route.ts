/**
 * Metal Hub — OTP Send API Route
 *
 * POST /api/otp/send
 * Generates a hashed OTP, stores it in otp_verifications,
 * and sends it via email.
 *
 * Rate limited: 3 sends per 10 minutes per email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectApiRoute, logAdminAction } from '@/lib/auth/protect-route';
import { generateOTP, hashOTP, getOTPExpiry, isValidOTPPurpose } from '@/lib/auth/otp';
import { checkRateLimit, RATE_LIMITS } from '@/lib/auth/rate-limiter';

export async function POST(request: NextRequest) {
  const auth = await protectApiRoute(request);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;

  // ── Parse body ──
  let body: { email?: string; purpose?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  const email = body.email || user.email;
  const purpose = body.purpose || 'admin_2fa';

  if (!email) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is required' } },
      { status: 400 },
    );
  }

  if (!isValidOTPPurpose(purpose)) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid OTP purpose' } },
      { status: 400 },
    );
  }

  // ── Rate limit ──
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimitResult = await checkRateLimit(
    supabase,
    `${email}:${ip}`,
    RATE_LIMITS.OTP_SEND.action,
    RATE_LIMITS.OTP_SEND.maxAttempts,
    RATE_LIMITS.OTP_SEND.windowMinutes,
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Too many OTP requests. Try again in ${rateLimitResult.retryAfterSeconds} seconds.`,
        },
      },
      { status: 429 },
    );
  }

  // ── Invalidate previous unused OTPs for this user + purpose ──
  await supabase
    .from('otp_verifications')
    .update({ is_used: true })
    .eq('user_id', user.id)
    .eq('purpose', purpose)
    .eq('is_used', false);

  // ── Generate + hash + store OTP ──
  const otpCode = generateOTP();
  const otpHash = hashOTP(otpCode);
  const expiresAt = getOTPExpiry();

  const { error: insertError } = await supabase.from('otp_verifications').insert({
    user_id: user.id,
    email,
    otp_hash: otpHash,
    purpose,
    attempts: 0,
    max_attempts: 5,
    is_used: false,
    expires_at: expiresAt.toISOString(),
    ip_address: ip,
    user_agent: request.headers.get('user-agent') || null,
  });

  if (insertError) {
    console.error('[OTP] Failed to store OTP:', insertError.message);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate OTP' } },
      { status: 500 },
    );
  }

  // ── Send OTP via email ──
  const { sendEmail, otpEmailTemplate } = await import('@/lib/services/email');
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
  const template = otpEmailTemplate(otpCode, expiryMinutes);

  const emailResult = await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  if (!emailResult.success) {
    console.error('[OTP] Email delivery failed:', emailResult.error);
    // Don't fail the request — the OTP is stored, user can retry
  }

  // ── Audit log ──
  await logAdminAction(supabase, {
    userId: user.id,
    action: 'otp_sent',
    resource: 'otp_verifications',
    details: { email, purpose },
    severity: 'info',
    request,
  });

  return NextResponse.json({
    success: true,
    data: {
      expiresIn: 600,
      email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    },
  });
}
