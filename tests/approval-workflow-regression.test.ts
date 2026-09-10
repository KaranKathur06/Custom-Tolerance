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

test('canonical approval RPC is defined only once across migration files', () => {
  const files = fs.readdirSync(migrationDir).filter((file) => file.endsWith('.sql'));
  const matches = files.flatMap((file) => {
    const text = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    const occurrences = [...text.matchAll(/create\s+or\s+replace\s+function\s+public\.review_seller_product_approval\s*\(/gi)];
    return occurrences.length ? [file] : [];
  });

  assert.equal(matches.length, 1, 'There must be a single canonical review_seller_product_approval migration definition.');
});

test('admin approval route invokes the canonical RPC through the service-role client', () => {
  const routeSource = fs.readFileSync(routePath, 'utf8');

  assert.match(routeSource, /adminDatabase\.rpc\(\s*["']review_seller_product_approval["']\s*,/s, 'Approval route must use the canonical RPC via the admin client.');
  assert.doesNotMatch(routeSource, /supabase\.rpc\(\s*["']review_seller_product_approval["']\s*,/s, 'Approval route must not use the user-scoped Supabase client for the final moderation RPC.');
});
