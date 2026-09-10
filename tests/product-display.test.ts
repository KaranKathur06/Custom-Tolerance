import test from "node:test";
import assert from "node:assert/strict";

import {
  formatBooleanField,
  formatCapability,
  formatDisplayValue,
  formatEnumLabel,
  formatFieldLabel,
  formatGrade,
  formatIncoterm,
  formatIndustry,
  formatLeadTime,
  formatList,
  formatPackaging,
  formatPaymentTerm,
  formatPrecision,
  formatPriceType,
  formatPriceUnit,
} from "@/lib/product/display";

test("formats manufacturing capabilities and industries", () => {
  assert.equal(formatCapability("cnc_turning"), "CNC Turning");
  assert.equal(formatCapability("robotic_welding"), "Robotic Welding");
  assert.equal(formatIndustry("two_wheeler"), "Two-Wheeler");
  assert.equal(formatIndustry("ev"), "Electric Vehicles");
});

test("formats commercial, logistics, and packaging values", () => {
  assert.equal(formatPriceType("ask_for_price"), "Request a Quote");
  assert.equal(formatPriceUnit("per_piece"), "Per Piece");
  assert.equal(formatPaymentTerm("advance_50_balance_50"), "50% Advance, 50% Balance");
  assert.equal(formatIncoterm("fob"), "FOB");
  assert.equal(formatPackaging("poly_wrap"), "Poly Wrap");
  assert.equal(formatPackaging("wooden_box"), "Wooden Box");
  assert.equal(formatLeadTime("1_2_weeks"), "1–2 Weeks");
});

test("preserves technical identifiers and tolerance meaning", () => {
  assert.equal(formatPrecision("precision_0_01"), "Precision (±0.01 mm)");
  assert.equal(formatPrecision("iso_2768_m"), "Medium/Standard (ISO 2768-m)");
  assert.equal(formatGrade("AISI 4140"), "AISI 4140");
  assert.equal(formatDisplayValue("SS304"), "SS304");
});

test("humanizes unknown values without exposing snake case", () => {
  assert.equal(formatEnumLabel("high_speed_cnc_turning"), "High Speed CNC Turning");
  assert.deepEqual(formatList(["fca", "fas", "fob"], formatIncoterm), ["FCA", "FAS", "FOB"]);
  assert.equal(formatFieldLabel("minimum_order"), "Minimum Order Quantity");
});

test("uses contextual boolean language", () => {
  assert.equal(formatBooleanField(true), "Yes");
  assert.equal(formatBooleanField(false), "No");
  assert.equal(formatBooleanField(true, "availability"), "Available");
  assert.equal(formatBooleanField(false, "availability"), "Not Available");
});
