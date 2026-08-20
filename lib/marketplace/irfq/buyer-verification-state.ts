import { getBuyerEligibility, type BuyerVerificationStep, type BuyerEligibilityState } from '@/lib/services/rfq-service';

export type BuyerVerificationStep = BuyerVerificationStep;

export type BuyerVerificationState = BuyerEligibilityState;

export function buildBuyerVerificationState(input: {
  emailVerified?: boolean;
  mobileVerified?: boolean;
  profileCompletionPercent?: number | null;
}): BuyerVerificationState {
  return getBuyerEligibility(input);
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
