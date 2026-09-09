import assert from "node:assert/strict";
import test from "node:test";
import { displayRole, normalizeGovernanceRole } from "../lib/admin/user-governance";
import {
  dossierRole,
  selectDossierFields,
  selectSellerManufacturingFields,
  selectSellerPerformanceFields,
  normalizeDossierValue,
} from "../lib/admin/user-dossier";

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
    ["name", "gst_number"],
  );
});

test("selectSellerManufacturingFields merges company + sellerProfile data", () => {
  const company = {
    annual_production_capacity: "5000 units/month",
    export_capability: true,
    factory_address: "Industrial Area, Pune",
  };
  const sellerProfile = {
    production_capacity: "Medium",
    certifications: ["ISO 9001", "ISO 14001"],
  };

  const fields = selectSellerManufacturingFields(company, sellerProfile);
  const keys = fields.map((f) => f.key);

  assert.ok(keys.includes("annual_production_capacity"));
  assert.ok(keys.includes("export_capability"));
  assert.ok(keys.includes("factory_address"));
  assert.ok(keys.includes("production_capacity"));
  assert.ok(keys.includes("certifications"));
  assert.equal(fields.find((f) => f.key === "production_capacity")?.value, "Medium");
});

test("selectSellerPerformanceFields extracts seller-only metrics from company", () => {
  const company = {
    name: "Acme Corp",
    response_rate: "92%",
    avg_response_hours: 4,
    completion_rate: "88%",
    gst_number: "GST-123",
  };

  const fields = selectSellerPerformanceFields(company);
  const keys = fields.map((f) => f.key);

  assert.ok(keys.includes("response_rate"));
  assert.ok(keys.includes("avg_response_hours"));
  assert.ok(keys.includes("completion_rate"));
  assert.ok(!keys.includes("name"), "name should not be in performance fields");
  assert.ok(!keys.includes("gst_number"), "gst_number should not be in performance fields");
});

test("normalizeDossierValue distinguishes null from undefined", () => {
  assert.equal(normalizeDossierValue(undefined), "—");
  assert.equal(normalizeDossierValue(null), "Not provided");
  assert.equal(normalizeDossierValue(""), "Not provided");
});

test("normalizeDossierValue renders booleans correctly", () => {
  assert.equal(normalizeDossierValue(true), "Yes");
  assert.equal(normalizeDossierValue(false), "No");
});

test("normalizeDossierValue handles arrays", () => {
  assert.equal(normalizeDossierValue(["ISO 9001", "CE"]), "ISO 9001, CE");
  assert.equal(normalizeDossierValue([]), "Not provided");
});

test("normalizeDossierValue passes through strings and numbers", () => {
  assert.equal(normalizeDossierValue("hello"), "hello");
  assert.equal(normalizeDossierValue(42), "42");
});

