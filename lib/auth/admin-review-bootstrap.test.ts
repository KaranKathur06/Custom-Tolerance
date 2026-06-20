import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hashAdminReviewAccessKey,
  isAdminReviewAccessKeyValid,
} from "./admin-review-bootstrap";

describe("admin review bootstrap key", () => {
  it("accepts only an exact key whose SHA-256 hash is configured", () => {
    const key = "review-key-that-is-at-least-thirty-two-bytes-long";
    const hash = hashAdminReviewAccessKey(key);

    assert.equal(isAdminReviewAccessKeyValid(key, hash), true);
    assert.equal(isAdminReviewAccessKeyValid(`${key}-wrong`, hash), false);
    assert.equal(isAdminReviewAccessKeyValid(key.slice(0, 31), hash), false);
    assert.equal(isAdminReviewAccessKeyValid(key, "invalid"), false);
  });
});

