import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Supabase%402323@db.lrfvfvxfjpowskzqebar.supabase.co:5432/postgres',
  });
  await client.connect();
  try {
    const res = await client.query(`select coalesce(to_regclass('public.irfq_usage_counters')::text, 'null') as table_exists;`);
    console.log(res.rows);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
