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
  formatIncoterms,
  formatIndustry,
  formatLeadTime,
  formatList,
  formatMaterial,
  formatPackaging,
  formatPaymentTerm,
  formatPaymentTerms,
  formatPackagingType,
  formatPrecision,
  formatPriceType,
  formatPriceUnit,
  formatShippingType,
  formatSpecification,
  formatUnit,
} from "@/lib/product/display";
import {
  CAPABILITY_GROUPS,
  INDUSTRY_GROUPS,
  LEAD_TIMES,
  PACKAGING_OPTIONS,
  PAYMENT_TERMS,
  PRIMARY_PACKAGING,
  SECONDARY_PACKAGING,
} from "@/lib/constants/product-options";

test("formats manufacturing capabilities and industries", () => {
  assert.equal(formatCapability("cnc_turning"), "CNC Turning");
  assert.equal(formatCapability("robotic_welding"), "Robotic Welding");
  assert.equal(formatIndustry("two_wheeler"), "Two-Wheeler");
  assert.equal(formatIndustry("ev"), "Electric Vehicles");
  assert.equal(formatIndustry("Electric Vehicles (EV)"), "Electric Vehicles (EV)");
  assert.equal(formatEnumLabel("sheet_metal"), "Sheet Metal");
  assert.equal(formatEnumLabel("heat_treatment"), "Heat Treatment");
  assert.equal(formatEnumLabel("cnc"), "CNC");
  assert.equal(formatEnumLabel("gst"), "GST");
  assert.equal(formatEnumLabel("msme"), "MSME");
  assert.equal(formatEnumLabel("url"), "URL");
  assert.equal(formatEnumLabel("high_speed_cnc_turning"), "High Speed CNC Turning");
  assert.equal(formatEnumLabel("iso_9001"), "ISO 9001");
  assert.equal(formatEnumLabel("iatf_16949"), "IATF 16949");
});

test("formats commercial, logistics, and packaging values", () => {
  assert.equal(formatPriceType("ask_for_price"), "Request a Quote");
  assert.equal(formatPriceUnit("per_piece"), "Per Piece");
  assert.equal(formatPaymentTerm("advance_50_balance_50"), "50% Advance, 50% Before Shipment");
  assert.equal(formatPaymentTerm("advance_30_balance_70"), "30% Advance, 70% Against Documents");
  assert.equal(formatPaymentTerm("Net 30 days after shipment"), "Net 30 days after shipment");
  assert.deepEqual(
    formatPaymentTerms("advance_50_balance_50, advance_30_balance_70"),
    ["50% Advance, 50% Before Shipment", "30% Advance, 70% Against Documents"],
  );
  assert.equal(formatIncoterm("fob"), "FOB");
  assert.equal(formatIncoterm("ex_works"), "EXW — Ex Works");
  assert.equal(formatPackaging("poly_wrap"), "Poly Wrap");
  assert.equal(formatPackaging("wooden_box"), "Wooden Box");
  assert.equal(formatPackagingType("wooden_box"), "Wooden Box");
  assert.equal(formatPackaging("corrugated_box"), "Corrugated Box");
  assert.equal(formatPackaging("wooden_crate"), "Wooden Crate");
  assert.equal(formatPackaging("pallet"), "Pallet");
  assert.equal(formatPackaging("not_required"), "Not Required");
  assert.equal(formatPackaging("custom"), "Custom Packaging");
  assert.equal(formatShippingType("packed"), "Packed");
  assert.equal(formatShippingType("loose"), "Loose");
  assert.equal(formatLeadTime("1_2_weeks"), "1–2 Weeks");
  assert.equal(formatLeadTime("1_week"), "1 Week");
  assert.equal(formatLeadTime("2_weeks"), "2 Weeks");
  assert.equal(formatLeadTime("2_4_weeks"), "2–4 Weeks");
  assert.equal(formatLeadTime("4_6_weeks"), "4–6 Weeks");
  assert.equal(formatLeadTime("lt_1_week"), "Less than 1 Week");
  assert.equal(formatLeadTime("custom"), "Custom");
  assert.equal(formatPriceType("fixed_price"), "Fixed Price");
  assert.equal(formatPriceType("negotiable"), "Negotiable");
  assert.equal(formatPriceUnit("per_kg"), "Per Kilogram");
  assert.equal(formatPriceUnit("per_unit"), "Per Unit");
  assert.equal(formatPriceUnit("per_ton"), "Per Ton");
  assert.equal(formatUnit("kg"), "kg");
});

test("preserves technical identifiers and tolerance meaning", () => {
  assert.equal(formatPrecision("precision_0_01"), "Precision (±0.01 mm)");
  assert.equal(formatPrecision("iso_2768_m"), "Medium/Standard (ISO 2768-m)");
  assert.equal(formatPrecision("custom"), "Custom Tolerance (specify on RFQ)");
  assert.equal(formatGrade("AISI 4140"), "AISI 4140");
  assert.equal(formatDisplayValue("SS304"), "SS304");
  assert.equal(formatDisplayValue(["Forged Aluminum Alloy", "BMW S58 OEM Specification"]), "Forged Aluminum Alloy, BMW S58 OEM Specification");
  assert.equal(formatSpecification("AISI 4140"), "AISI 4140");
  assert.equal(formatSpecification("ASTM A36"), "ASTM A36");
  assert.equal(formatSpecification("304L"), "304L");
  assert.equal(formatMaterial("Forged Aluminum Alloy"), "Forged Aluminum Alloy");
  assert.equal(formatSpecification("BMW S58 OEM Specification / High Strength Forged Alloy"), "BMW S58 OEM Specification / High Strength Forged Alloy");
  assert.equal(formatSpecification("iso_9001"), "ISO 9001");
  assert.equal(formatSpecification("iso_9001, iatf_16949"), "ISO 9001, IATF 16949");
});

test("humanizes unknown values without exposing snake case", () => {
  assert.equal(formatEnumLabel("high_speed_cnc_turning"), "High Speed CNC Turning");
  assert.deepEqual(formatList(["fca", "fas", "fob"], formatIncoterm), ["FCA", "FAS", "FOB"]);
  assert.deepEqual(formatIncoterms(["fca", "fas", "fob"]), ["FCA", "FAS", "FOB"]);
  assert.deepEqual(formatIncoterms("fca, fas, fob"), ["FCA", "FAS", "FOB"]);
  assert.equal(formatFieldLabel("minimum_order"), "Minimum Order Quantity");
  assert.equal(formatFieldLabel("dies_and_tools"), "Dies & Tools");
  assert.equal(formatFieldLabel("countryOrigin"), "Country of Origin");
  assert.equal(formatFieldLabel("gstNumber"), "GST Number");
});

test("uses contextual boolean language", () => {
  assert.equal(formatBooleanField(true), "Yes");
  assert.equal(formatBooleanField(false), "No");
  assert.equal(formatBooleanField(true, "availability"), "Available");
  assert.equal(formatBooleanField(false, "availability"), "Not Available");
  assert.equal(formatBooleanField(" TRUE "), "Yes");
});

test("covers current seller-controlled option identifiers", () => {
  const capabilities = CAPABILITY_GROUPS.flatMap(({ items }) => items);
  const industries = INDUSTRY_GROUPS.flatMap(({ items }) => items);
  const packaging = [...PRIMARY_PACKAGING, ...SECONDARY_PACKAGING, ...PACKAGING_OPTIONS];

  for (const option of [...capabilities, ...industries, ...packaging, ...PAYMENT_TERMS, ...LEAD_TIMES]) {
    assert.equal(formatEnumLabel(option.id).includes("_"), false, option.id);
  }

  assert.deepEqual(
    formatList(["fca", "fas", "fob"], formatIncoterm),
    ["FCA", "FAS", "FOB"],
  );
  assert.deepEqual(
    formatList(["advance_50_balance_50", "advance_30_balance_70"], formatPaymentTerm),
    ["50% Advance, 50% Before Shipment", "30% Advance, 70% Against Documents"],
  );
});
