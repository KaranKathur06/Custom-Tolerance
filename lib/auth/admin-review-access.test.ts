import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  ADMIN_REVIEW_ACCESS_MARKER,
  evaluateAdminReviewAccess,
  getAdminReviewAccessConfiguration,
} from "./admin-review-access";

const ENV_KEYS = [
  "ADMIN_REVIEW_ACCESS_ENABLED",
  "ADMIN_REVIEW_ACCESS_KEY_HASH",
  "ADMIN_REVIEW_ACCESS_EXPIRES_AT",
  "ADMIN_REVIEWER_EMAIL",
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const NOW = Date.parse("2026-06-20T12:00:00.000Z");

function configure(overrides: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}) {
  process.env.ADMIN_REVIEW_ACCESS_ENABLED = "true";
  process.env.ADMIN_REVIEW_ACCESS_KEY_HASH = "a".repeat(64);
  process.env.ADMIN_REVIEW_ACCESS_EXPIRES_AT = "2026-06-21T11:59:00.000Z";
  process.env.ADMIN_REVIEWER_EMAIL = "claude-reviewer@customtolerance.com";
  Object.assign(process.env, overrides);
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("admin review access policy", () => {
  it("accepts an active, correctly configured review window", () => {
    configure();
    const result = getAdminReviewAccessConfiguration(NOW);
    assert.equal(result.active, true);
    assert.equal(result.reason, "active");
  });

  it("fails closed when disabled or misconfigured", () => {
    configure({ ADMIN_REVIEW_ACCESS_ENABLED: "false" });
    assert.equal(getAdminReviewAccessConfiguration(NOW).reason, "disabled");

    configure({ ADMIN_REVIEW_ACCESS_KEY_HASH: "not-a-sha256-hash" });
    assert.equal(getAdminReviewAccessConfiguration(NOW).reason, "misconfigured");
  });

  it("rejects expired and overlong windows", () => {
    configure({ ADMIN_REVIEW_ACCESS_EXPIRES_AT: "2026-06-20T11:59:59.000Z" });
    assert.equal(getAdminReviewAccessConfiguration(NOW).reason, "expired");

    configure({ ADMIN_REVIEW_ACCESS_EXPIRES_AT: "2026-06-21T12:00:01.000Z" });
    assert.equal(getAdminReviewAccessConfiguration(NOW).reason, "window_too_long");
  });

  it("only activates the trusted reviewer identity", () => {
    configure();
    const user = {
      email: "CLAUDE-REVIEWER@CUSTOMTOLERANCE.COM",
      app_metadata: { review_access: ADMIN_REVIEW_ACCESS_MARKER, role: "super_admin" },
    };
    assert.deepEqual(evaluateAdminReviewAccess(user, NOW), {
      isReviewer: true,
      active: true,
      reason: "active",
      expiresAt: new Date("2026-06-21T11:59:00.000Z"),
    });

    assert.equal(
      evaluateAdminReviewAccess({ ...user, email: "someone@example.com" }, NOW).reason,
      "identity_mismatch",
    );
    assert.equal(
      evaluateAdminReviewAccess({ ...user, app_metadata: { role: "super_admin" } }, NOW).reason,
      "not_reviewer",
    );
  });
});

