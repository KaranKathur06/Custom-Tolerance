export type BuyerVerificationStep = 'email_verification' | 'mobile_verification' | 'profile_completion';

export type BuyerVerificationState =
  | { status: 'verified' }
  | { status: 'unverified'; missing: BuyerVerificationStep[]; canPostAsDraft: true }
  | { status: 'partially_verified'; missing: BuyerVerificationStep[]; canPostAsDraft: true };

export function buildBuyerVerificationState(input: {
  emailVerified?: boolean;
  mobileVerified?: boolean;
  profileCompletionPercent?: number | null;
}): BuyerVerificationState {
  const missing: BuyerVerificationStep[] = [];

  if (!input.emailVerified) missing.push('email_verification');
  if (!input.mobileVerified) missing.push('mobile_verification');
  if ((input.profileCompletionPercent ?? 0) < 40) missing.push('profile_completion');

  if (missing.length === 0) {
    return { status: 'verified' };
  }

  if (missing.length === 1 && missing[0] === 'profile_completion') {
    return { status: 'partially_verified', missing, canPostAsDraft: true };
  }

  if (missing.includes('email_verification') && missing.includes('mobile_verification')) {
    return { status: 'unverified', missing, canPostAsDraft: true };
  }

  return { status: 'partially_verified', missing, canPostAsDraft: true };
}

const acronymMap: Record<string, string> = {
  url: 'URL',
  gst: 'GST',
  iso: 'ISO',
  msme: 'MSME',
  otp: 'OTP',
};

export function formatDisplayLabel(value: string): string {
  if (!value) return '';

  const normalized = value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();

  return normalized
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (acronymMap[lower]) return acronymMap[lower];
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace(/\bU R L\b/i, 'URL')
    .replace(/\bG S T\b/i, 'GST');
}
