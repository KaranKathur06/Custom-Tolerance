import test from 'node:test';
import assert from 'node:assert/strict';
import { getCategoryDefinitions, getSettingDefinition } from '@/lib/settings/registry';
import { isVerifiedBuyer, marketplaceStatusAllowsPublicRead } from '@/lib/settings/policy';

test('settings registry exposes typed operational definitions with consumers', () => {
  const definition = getSettingDefinition('require_verified_buyer_to_publish');
  assert.equal(definition?.type, 'boolean');
  assert.equal(definition?.defaultValue, true);
  assert.equal(definition?.consumer, 'RFQ publish service');
});

test('settings registry groups category definitions', () => {
  const definitions = getCategoryDefinitions('marketplace');
  assert.ok(definitions.some((definition) => definition.key === 'marketplace_status'));
  assert.ok(definitions.every((definition) => definition.category === 'marketplace'));
});

test('verification policy requires email, mobile, and profile completion', () => {
  assert.equal(isVerifiedBuyer({ emailVerified: true, mobileVerified: true, profileCompletionPercent: 40 }), true);
  assert.equal(isVerifiedBuyer({ emailVerified: true, mobileVerified: false, profileCompletionPercent: 100 }), false);
  assert.equal(isVerifiedBuyer({ emailVerified: true, mobileVerified: true, profileCompletionPercent: 39 }), false);
});

test('marketplace status fails closed for public reads', () => {
  assert.equal(marketplaceStatusAllowsPublicRead('open'), true);
  assert.equal(marketplaceStatusAllowsPublicRead('limited'), true);
  assert.equal(marketplaceStatusAllowsPublicRead('closed'), false);
  assert.equal(marketplaceStatusAllowsPublicRead('unknown'), false);
});