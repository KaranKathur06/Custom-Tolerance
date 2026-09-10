import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const migrationDir = path.join(repoRoot, 'supabase', 'migrations');
const routePath = path.join(repoRoot, 'app', 'api', 'admin', 'products', 'approvals', 'route.ts');
const sellerProductsRoutePath = path.join(repoRoot, 'app', 'api', 'dashboard', 'seller', 'products', 'route.ts');
const adminListingDetailRoutePath = path.join(repoRoot, 'app', 'api', 'admin', 'listings', '[id]', 'route.ts');

test('canonical approval RPC is defined only once across migration files', () => {
  const files = fs.readdirSync(migrationDir).filter((file) => file.endsWith('.sql'));
  const matches = files.flatMap((file) => {
    const text = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    const occurrences = [...text.matchAll(/create\s+or\s+replace\s+function\s+public\.review_seller_product_approval\s*\(/gi)];
    return occurrences.length ? [file] : [];
  });

  assert.deepEqual(
    matches.sort(),
    ['20260909190000_canonical_product_lifecycle.sql', '20260910120000_seller_approval_publish_flow.sql'],
    'Approval RPC definitions must be the original canonical definition plus the intentional lifecycle evolution migration.',
  );
});

test('admin approval route invokes the server-only RPC with the verified admin identity', () => {
  const routeSource = fs.readFileSync(routePath, 'utf8');

  assert.match(routeSource, /adminDatabase\.rpc\(\s*["']review_seller_product_approval_as_admin["']\s*,/, 'Approval route must invoke the server-only moderation RPC.');
  assert.match(routeSource, /p_actor_id:\s*user\.id/, 'Approval route must pass the server-verified admin identity.');
  assert.match(routeSource, /supabase\.rpc\(\s*["']review_seller_product_approval["']\s*,/, 'Approval route must support rolling deployments before the new RPC is available.');
  assert.match(routeSource, /MODERATION_RPC_UNAVAILABLE/, 'Missing moderation RPCs must be surfaced as a deployment error.');
  assert.match(routeSource, /: 500;/, 'Unexpected moderation failures must not be reported as concurrency conflicts.');
});

test('seller product PATCH distinguishes omitted relations from explicit clears', () => {
  const routeSource = fs.readFileSync(sellerProductsRoutePath, 'utf8');

  assert.match(routeSource, /hasOwnProperty\.call\(body, field\)/, 'Relation persistence must check whether a field was sent.');
  assert.match(routeSource, /if \(items === null\) return;/, 'Omitted relation fields must leave existing rows unchanged.');
  assert.match(routeSource, /if \(items\.length > 0\)/, 'Explicit non-empty relation arrays must be persisted.');
  assert.doesNotMatch(routeSource, /body\.capabilities && handleRelation/, 'Relation persistence must not use truthiness as PATCH semantics.');
});

test('admin listing detail does not mask relation read failures as empty fields', () => {
  const routeSource = fs.readFileSync(adminListingDetailRoutePath, 'utf8');

  assert.match(routeSource, /auth\.supabase\.from\('product_capabilities'\)/, 'Admin detail must retry relation reads with the authenticated client.');
  assert.match(routeSource, /DATA_RETRIEVAL_FAILED/, 'Admin detail must expose incomplete relation retrieval as an error.');
  assert.doesNotMatch(routeSource, /ADMIN_LISTING_DETAIL_RELATION_FALLBACK/, 'Admin detail must not silently fall back to incomplete product fields.');
});
