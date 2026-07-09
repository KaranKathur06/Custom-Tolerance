import assert from "node:assert/strict";
import {
  BUYER_SERVICES_OPTIONS,
  normalizeBuyerServices,
  isApprovedBuyerService,
} from "../lib/constants/buyer-services";

assert.equal(BUYER_SERVICES_OPTIONS.length, 8, "expected exactly 8 approved buyer services");
assert.deepEqual(
  BUYER_SERVICES_OPTIONS.map((option) => option.id),
  [
    "UNBRANDED_NO_BRAND",
    "CONTRACT_MANUFACTURING",
    "PRIVATE_LABEL",
    "OEM",
    "CUSTOM_PRODUCT_DEVELOPMENT",
    "PROTOTYPE_SAMPLE_DEVELOPMENT",
    "JOB_WORK_SERVICES",
    "FINAL_FINISHED_READY_TO_MARKET",
  ],
);

assert.deepEqual(
  normalizeBuyerServices([
    "Contract Manufacturing",
    "White Label",
    "Reverse Engineering",
    "OEM",
    "Custom Product Development",
  ]),
  ["CONTRACT_MANUFACTURING", "PRIVATE_LABEL", "OEM", "CUSTOM_PRODUCT_DEVELOPMENT"],
);

assert.equal(isApprovedBuyerService("CONTRACT_MANUFACTURING"), true);
assert.equal(isApprovedBuyerService("Reverse Engineering"), false);

console.log("buyer-services verification passed");
