import assert from "node:assert/strict";
import test from "node:test";
import { displayRole, normalizeGovernanceRole } from "../lib/admin/user-governance";

test("admin governance preserves the both marketplace role", () => {
  assert.equal(normalizeGovernanceRole("both"), "both");
  assert.equal(normalizeGovernanceRole("Buyer"), "buyer");
  assert.equal(displayRole("both"), "Buyer & Seller");
});

test("admin governance keeps buyer and seller roles distinct", () => {
  assert.equal(normalizeGovernanceRole("buyer"), "buyer");
  assert.equal(normalizeGovernanceRole("seller"), "seller");
});
