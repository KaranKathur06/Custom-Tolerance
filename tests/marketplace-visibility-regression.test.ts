import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routeSource = fs.readFileSync(path.join(repoRoot, "app/api/marketplace/route.ts"), "utf8");
const policySource = fs.readFileSync(
  path.join(repoRoot, "supabase/migrations/20260910160000_public_marketplace_product_read.sql"),
  "utf8",
);

test("marketplace products use the canonical public eligibility predicate", () => {
  assert.match(routeSource, /applyMarketplaceProductEligibility\(/);
  assert.doesNotMatch(routeSource, /profile_id[,\s\n]*=\s*auth\.uid\(\)/i);
  assert.match(routeSource, /product_images\(url, storage_path, is_primary, display_order\)/);
  assert.match(routeSource, /featured_image:/);
});

test("public marketplace RLS permits eligible reads without permitting private products", () => {
  assert.match(policySource, /for select to anon, authenticated/);
  assert.match(policySource, /approval_status = 'approved'/);
  assert.match(policySource, /lifecycle_status = 'active'/);
  assert.match(policySource, /coalesce\(is_published, false\) = true/);
  assert.match(policySource, /coalesce\(is_visible, false\) = true/);
  assert.match(policySource, /product_images_public_marketplace_select/);
});