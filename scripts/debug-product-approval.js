const fs = require('fs');
const { Client } = require('pg');

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
  env[key] = value;
}

const productId = '0f5e858a-cb93-4394-830f-19b65fad9e3';
const client = new Client({ connectionString: env.DATABASE_URL });

(async () => {
  await client.connect();

  const approvals = await client.query(
    `SELECT id, seller_product_id, status, reviewed_by, reviewed_at, created_at, rejection_reason, notes
     FROM public.product_approvals
     WHERE seller_product_id = $1
     ORDER BY created_at DESC`,
    [productId]
  );

  const product = await client.query(
    `SELECT id, approval_status, lifecycle_status, is_published, published_at, approved_by, approved_at,
            draft_version, updated_at
     FROM public.seller_products
     WHERE id = $1`,
    [productId]
  );

  const events = await client.query(
    `SELECT id, approval_id, actor_id, action, metadata, created_at
     FROM public.product_audit_events
     WHERE seller_product_id = $1
     ORDER BY created_at DESC LIMIT 20`,
    [productId]
  );

  const indexes = await client.query(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE schemaname='public' AND tablename='product_approvals'
     ORDER BY indexname`
  );

  console.log('APPROVALS');
  console.log(JSON.stringify(approvals.rows, null, 2));
  console.log('PRODUCT');
  console.log(JSON.stringify(product.rows, null, 2));
  console.log('AUDIT_EVENTS');
  console.log(JSON.stringify(events.rows, null, 2));
  console.log('INDEXES');
  console.log(JSON.stringify(indexes.rows, null, 2));

  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
