import test from 'node:test';
import assert from 'node:assert/strict';

import { isGstApiEnabled, isGstVerificationDisabled } from '@/lib/services/gst-client';

test('GST verification is disabled during tests and when explicitly bypassed', () => {
  const previousEnv = { ...process.env };

  try {
    delete process.env.NEXT_PUBLIC_ENABLE_GST_API;
    delete process.env.GST_API_KEY;
    delete process.env.NEXT_PUBLIC_DISABLE_GST_AUTO_CHECK;

    assert.equal(isGstApiEnabled(), false);
    assert.equal(isGstVerificationDisabled(), process.env.NODE_ENV === 'test');

    process.env.NEXT_PUBLIC_DISABLE_GST_AUTO_CHECK = 'true';
    assert.equal(isGstVerificationDisabled(), true);
  } finally {
    process.env = previousEnv;
  }
});
