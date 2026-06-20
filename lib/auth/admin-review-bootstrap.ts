import { createHash, timingSafeEqual } from "node:crypto";

export function hashAdminReviewAccessKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function isAdminReviewAccessKeyValid(key: unknown, expectedHash: string): boolean {
  if (typeof key !== "string" || key.length < 32 || key.length > 512) return false;
  if (!/^[a-f0-9]{64}$/.test(expectedHash)) return false;

  const actual = Buffer.from(hashAdminReviewAccessKey(key), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

