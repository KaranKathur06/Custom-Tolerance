import assert from 'node:assert/strict';
import test from 'node:test';
import { listingStatusForQueue, normalizeUserRole, roleDatabaseValues } from '../lib/admin/governance-contracts';

test('canonical role contract normalizes supported values and rejects unknown values', () => {
  assert.equal(normalizeUserRole('Buyer'), 'BUYER');
  assert.equal(normalizeUserRole('BUYER'), 'BUYER');
  assert.equal(normalizeUserRole('superadmin'), 'SUPER_ADMIN');
  assert.equal(normalizeUserRole('not-a-role'), null);
});

test('buyer filters query buyer role values only', () => {
  assert.deepEqual(roleDatabaseValues('BUYER'), ['buyer', 'BUYER']);
});

test('pending queue maps to the approval workflow status', () => {
  assert.equal(listingStatusForQueue('pending'), 'pending');
  assert.equal(listingStatusForQueue('all'), null);
});