import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRfqInput } from '@/lib/marketplace/rfq-validation';

test('validateRfqInput rejects non-positive or non-integer quantities', () => {
  const errors = validateRfqInput({ quantity: '-5' });

  assert.equal(errors.quantity, 'Quantity must be a whole number greater than 0');
});

test('validateRfqInput rejects a budget maximum lower than the minimum', () => {
  const errors = validateRfqInput({ budgetMin: '50000', budgetMax: '100' });

  assert.equal(errors.budgetMax, 'Budget maximum cannot be less than budget minimum');
});

test('validateRfqInput allows valid quantity and budget ranges', () => {
  const errors = validateRfqInput({ quantity: '500', budgetMin: '50000', budgetMax: '100000' });

  assert.deepEqual(errors, {});
});
