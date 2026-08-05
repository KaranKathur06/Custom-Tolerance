import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBuyerVerificationState, formatDisplayLabel } from '@/lib/marketplace/irfq/buyer-verification-state';

test('buildBuyerVerificationState returns verified when buyer requirements are complete', () => {
  const state = buildBuyerVerificationState({
    emailVerified: true,
    mobileVerified: true,
    profileCompletionPercent: 80,
  });

  assert.deepEqual(state, { status: 'verified' });
});

test('buildBuyerVerificationState surfaces missing verification steps for draft users', () => {
  const state = buildBuyerVerificationState({
    emailVerified: false,
    mobileVerified: true,
    profileCompletionPercent: 25,
  });

  assert.equal(state.status, 'partially_verified');
  assert.deepEqual(state.missing, ['email_verification', 'profile_completion']);
  assert.equal(state.canPostAsDraft, true);
});

test('formatDisplayLabel expands known acronyms and cleans separators', () => {
  assert.equal(formatDisplayLabel('Factory Video U R L'), 'Factory Video URL');
  assert.equal(formatDisplayLabel('gst_number'), 'GST Number');
  assert.equal(formatDisplayLabel('company_name'), 'Company Name');
});
