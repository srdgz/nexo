import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgtap } from '@electric-sql/pglite-pgtap';

const root = new URL('../supabase/', import.meta.url);
const migrationsDir = new URL('migrations/', root);
const testsDir = new URL('tests/database/', root);

const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

  create extension pgtap;
`;

async function sqlFiles(dir) {
  const names = (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort();
  return Promise.all(
    names.map(async (name) => ({ name, sql: await readFile(new URL(name, dir), 'utf8') })),
  );
}

function tapLines(results) {
  return results
    .flatMap((result) => result.rows)
    .flatMap((row) => Object.values(row))
    .filter((value) => typeof value === 'string')
    .flatMap((value) => value.split('\n'));
}

const db = await PGlite.create({ extensions: { pgtap } });
await db.exec(SUPABASE_SHIM);

for (const migration of await sqlFiles(migrationsDir)) {
  await db.exec(migration.sql);
  console.log(`applied ${migration.name}`);
}

let failures = 0;

for (const test of await sqlFiles(testsDir)) {
  let lines;
  try {
    lines = tapLines(await db.exec(test.sql));
  } catch (error) {
    failures += 1;
    console.error(`\n${test.name}\n  error: ${error.message}`);
    await db.exec('rollback').catch(() => undefined);
    continue;
  }

  const plan = lines.find((line) => /^1\.\.\d+$/.test(line));
  const planned = plan ? Number(plan.split('..')[1]) : 0;
  const results = lines.filter((line) => /^(not )?ok \d+/.test(line));
  const failed = results.filter((line) => line.startsWith('not ok'));
  const problems = [...failed];
  if (results.length !== planned) {
    problems.push(`planned ${planned} tests but ran ${results.length}`);
  }

  console.log(`\n${test.name}: ${results.length - failed.length}/${planned} passed`);
  for (const problem of problems) {
    console.error(`  ${problem}`);
    const diagnostics = lines
      .slice(lines.indexOf(problem) + 1)
      .filter((line) => line.startsWith('#'));
    for (const line of diagnostics.slice(0, 4)) {
      console.error(`  ${line}`);
    }
  }
  failures += problems.length;
}

await db.close();

if (failures > 0) {
  console.error(`\n${failures} database test problem(s)`);
  process.exit(1);
}
console.log('\nAll database tests passed');
