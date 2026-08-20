import assert from "node:assert/strict";
import test from "node:test";
import { displayRole, normalizeGovernanceRole } from "../lib/admin/user-governance";
import { dossierRole, selectDossierFields } from "../lib/admin/user-dossier";

test("admin governance preserves the both marketplace role", () => {
  assert.equal(normalizeGovernanceRole("both"), "both");
  assert.equal(normalizeGovernanceRole("Buyer"), "buyer");
  assert.equal(displayRole("both"), "Buyer & Seller");
});

test("admin governance keeps buyer and seller roles distinct", () => {
  assert.equal(normalizeGovernanceRole("buyer"), "buyer");
  assert.equal(normalizeGovernanceRole("seller"), "seller");
});

test("admin dossier fails closed for missing roles", () => {
  assert.equal(normalizeGovernanceRole(null), "unknown");
  assert.equal(dossierRole("unknown" as never), "unknown");
});

test("admin dossier field maps prevent cross-role leakage", () => {
  const company = {
    name: "Acme",
    annual_production_capacity: "1000 units",
    export_capability: true,
    gst_number: "GST-123",
  };

  assert.deepEqual(
    selectDossierFields(company, "buyer", "company").map((field) => field.key),
    ["name", "gst_number"],
  );
  assert.deepEqual(
    selectDossierFields(company, "seller", "company").map((field) => field.key),
    ["name", "gst_number", "annual_production_capacity", "export_capability"],
  );
});
