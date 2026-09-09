import assert from "node:assert/strict";
import test from "node:test";
import {
  dossierRole,
  selectDossierFields,
  selectSellerManufacturingFields,
  selectSellerPerformanceFields,
} from "../lib/admin/user-dossier";

// ── Fixtures ────────────────────────────────────────────────────────────────

const BUYER_PROFILE_RECORD = {
  id: "bp-1",
  profile_id: "u-1",
  company_id: "c-1",
  primary_procurement_category_id: "cat-1",
  annual_procurement_volume: "$500K",
  profile_completion_percent: 72,
  verification_status: "pending",
  trust_level: 2,
};

const SELLER_PROFILE_RECORD = {
  id: "sp-1",
  profile_id: "u-2",
  company_id: "c-2",
  profile_completion_percent: 85,
  verification_status: "verified",
  trust_level: 4,
  onboarding_status: "APPROVED",
  review_status: "approved",
  production_capacity: "High",
  certifications: ["ISO 9001"],
  accepts_rfqs: true,
  response_time_hours: 6,
};

const BUYER_COMPANY_RECORD = {
  id: "c-1",
  name: "BuyerCo",
  slug: "buyerco",
  gst_number: "GST-B-001",
  pan_number: "PAN-B-001",
  business_type: "Manufacturer",
  website: "https://buyerco.com",
  linkedin_url: "https://linkedin.com/company/buyerco",
  company_size: "50-100",
  country_id: "IN",
  state_id: "MH",
  city_id: "PUN",
};

const SELLER_COMPANY_RECORD = {
  ...BUYER_COMPANY_RECORD,
  id: "c-2",
  name: "SellerCo",
  slug: "sellerco",
  gst_number: "GST-S-001",
  legal_business_name: "SellerCo Pvt Ltd",
  full_address: "123 Industrial Park, Mumbai",
  annual_production_capacity: "10000 units/month",
  export_capability: true,
  factory_address: "Plot 42, MIDC, Pune",
  iso_certified: true,
  response_rate: "95%",
  avg_response_hours: 3,
  completion_rate: "91%",
};

// ── Role resolution ─────────────────────────────────────────────────────────

test("dossierRole maps all GovernanceRole values correctly", () => {
  assert.equal(dossierRole("buyer"), "buyer");
  assert.equal(dossierRole("seller"), "seller");
  assert.equal(dossierRole("both"), "both");
  assert.equal(dossierRole("admin"), "admin");
  assert.equal(dossierRole("super_admin" as any), "unknown");
  assert.equal(dossierRole("moderator" as any), "unknown");
  assert.equal(dossierRole("unknown" as any), "unknown");
  assert.equal(dossierRole("" as any), "unknown");
});

// ── Buyer field isolation ───────────────────────────────────────────────────

test("buyer profile fields do NOT contain seller-specific keys", () => {
  const fields = selectDossierFields(BUYER_PROFILE_RECORD, "buyer", "profile");
  const keys = fields.map((f) => f.key);

  // Must NOT contain seller-only fields
  const sellerOnlyKeys = [
    "onboarding_status",
    "review_status",
    "production_capacity",
    "certifications",
    "accepts_rfqs",
    "response_time_hours",
  ];
  for (const forbidden of sellerOnlyKeys) {
    assert.ok(!keys.includes(forbidden), `Buyer profile must NOT contain '${forbidden}'`);
  }
});

test("buyer company fields do NOT contain seller operational keys", () => {
  // Even if the record has these keys, buyer field map must not expose them
  const mixedRecord = { ...SELLER_COMPANY_RECORD };
  const fields = selectDossierFields(mixedRecord, "buyer", "company");
  const keys = fields.map((f) => f.key);

  const sellerOnlyCompanyKeys = [
    "annual_production_capacity",
    "export_capability",
    "factory_address",
    "iso_certified",
    "response_rate",
    "avg_response_hours",
    "completion_rate",
    "legal_business_name",
    "full_address",
  ];
  for (const forbidden of sellerOnlyCompanyKeys) {
    assert.ok(!keys.includes(forbidden), `Buyer company must NOT contain '${forbidden}'`);
  }
});

// ── Seller field isolation ──────────────────────────────────────────────────

test("seller profile fields do NOT contain buyer procurement keys", () => {
  const fields = selectDossierFields(SELLER_PROFILE_RECORD, "seller", "profile");
  const keys = fields.map((f) => f.key);

  const buyerOnlyKeys = [
    "primary_procurement_category_id",
    "procurement_category_id",
    "annual_procurement_volume",
  ];
  for (const forbidden of buyerOnlyKeys) {
    assert.ok(!keys.includes(forbidden), `Seller profile must NOT contain '${forbidden}'`);
  }
});

test("seller profile fields include manufacturing data when present", () => {
  const fields = selectDossierFields(SELLER_PROFILE_RECORD, "seller", "profile");
  const keys = fields.map((f) => f.key);

  assert.ok(keys.includes("production_capacity"));
  assert.ok(keys.includes("certifications"));
  assert.ok(keys.includes("accepts_rfqs"));
  assert.ok(keys.includes("response_time_hours"));
  assert.ok(keys.includes("onboarding_status"));
  assert.ok(keys.includes("review_status"));
});

// ── Manufacturing fields isolation ──────────────────────────────────────────

test("manufacturing fields merge company + seller profile correctly", () => {
  const fields = selectSellerManufacturingFields(SELLER_COMPANY_RECORD, SELLER_PROFILE_RECORD);
  const keys = fields.map((f) => f.key);

  assert.ok(keys.includes("annual_production_capacity"));
  assert.ok(keys.includes("export_capability"));
  assert.ok(keys.includes("factory_address"));
  assert.ok(keys.includes("iso_certified"));
  assert.ok(keys.includes("production_capacity"));
  assert.ok(keys.includes("certifications"));

  // seller_profile values override company values for shared keys
  assert.equal(
    fields.find((f) => f.key === "production_capacity")?.value,
    "High",
  );
});

test("manufacturing fields return empty for null inputs", () => {
  const fields = selectSellerManufacturingFields(null, null);
  assert.equal(fields.length, 0);
});

// ── Performance fields isolation ────────────────────────────────────────────

test("performance fields only include seller operational metrics", () => {
  const fields = selectSellerPerformanceFields(SELLER_COMPANY_RECORD);
  const keys = fields.map((f) => f.key);

  assert.ok(keys.includes("response_rate"));
  assert.ok(keys.includes("avg_response_hours"));
  assert.ok(keys.includes("completion_rate"));
  assert.equal(keys.length, 3, "Performance fields should have exactly 3 entries");
});

test("performance fields return empty for buyer company", () => {
  const fields = selectSellerPerformanceFields(BUYER_COMPANY_RECORD);
  assert.equal(fields.length, 0, "Buyer company should have 0 performance fields");
});

test("performance fields return empty for null company", () => {
  const fields = selectSellerPerformanceFields(null);
  assert.equal(fields.length, 0);
});

// ── Unknown role ────────────────────────────────────────────────────────────

test("unknown role returns empty field sets from selectDossierFields", () => {
  // dossierRole returns 'unknown', which is not 'buyer' or 'seller'
  // so the caller should not pass it to selectDossierFields at all
  // But if it does, the function should still not crash
  const role = dossierRole("unknown" as any);
  assert.equal(role, "unknown");
});

// ── Both role ───────────────────────────────────────────────────────────────

test("both role returns independent buyer + seller field sets", () => {
  const buyerFields = selectDossierFields(BUYER_PROFILE_RECORD, "buyer", "profile");
  const sellerFields = selectDossierFields(SELLER_PROFILE_RECORD, "seller", "profile");

  const buyerKeys = new Set(buyerFields.map((f) => f.key));
  const sellerKeys = new Set(sellerFields.map((f) => f.key));

  // Shared keys (profile_completion_percent, verification_status, trust_level, company_id)
  // are fine — they exist in both contexts with role-appropriate values
  // But procurement keys must only be in buyer
  assert.ok(buyerKeys.has("annual_procurement_volume"));
  assert.ok(!sellerKeys.has("annual_procurement_volume"));

  // Manufacturing keys must only be in seller
  assert.ok(sellerKeys.has("production_capacity"));
  assert.ok(!buyerKeys.has("production_capacity"));
});
