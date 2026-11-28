// Applies db/migrations/*.sql in filename order. Safe to run repeatedly.
// Stand-alone on purpose: it only needs DATABASE_URL (no JWT secret), so deploy pipelines can run it early.
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : undefined,
});

try {
  await client.connect();
  // Prevents two instances migrating at the same time.
  await client.query('select pg_advisory_lock(727274)');
  await client.query(`create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )`);
  // Older deployments used `name`; normalise it so this runner can resume.
  await client.query(`
    do $$
    begin
      if exists (
        select 1 from information_schema.columns
        where table_schema = current_schema() and table_name = 'schema_migrations' and column_name = 'name'
      ) and not exists (
        select 1 from information_schema.columns
        where table_schema = current_schema() and table_name = 'schema_migrations' and column_name = 'filename'
      ) then
        alter table schema_migrations rename column name to filename;
      end if;
    end $$;
  `);
  const done = new Set((await client.query('select filename from schema_migrations')).rows.map((r) => r.filename));
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    console.log(`Applying ${file} ...`);
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations (filename) values ($1)', [file]);
      await client.query('commit');
      applied += 1;
    } catch (err) {
      await client.query('rollback');
      throw new Error(`Migration ${file} failed: ${err.message}`);
    }
  }
  console.log(applied ? `Done. Applied ${applied} migration(s).` : 'Database is already up to date.');
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
