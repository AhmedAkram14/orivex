/**
 * Demo Data & Profile Avatar Pass -- safe reset for the demo environment
 * (docs section 20). Every row `seed.ts` creates lives in this local
 * Postgres instance, and this local instance never holds anything else (no
 * other seed script, no manual data-entry flow targets it) -- so the safest
 * and most honest "reset only the demo identities" mechanism available is to
 * drop and recreate the whole schema via Prisma's own `migrate reset`,
 * guarded by an explicit, code-enforced check that DATABASE_URL is a local
 * connection string. This can never reach the real production Neon database
 * (a completely different connection string, never read by this script) --
 * the guard exists so a misconfigured environment fails loudly instead of
 * silently wiping the wrong database.
 *
 * Run with: `npm run seed:reset` (from apps/backend).
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Reads DATABASE_URL the same way the Prisma CLI itself does for this
 * project -- from `prisma/.env` (see that file) -- without pulling in the
 * `dotenv` package as a direct dependency just for this one check. Resolved
 * against `process.cwd()` (this script -- like `seed.ts` -- is only ever run
 * via `npm run seed:reset` from `apps/backend`), not against this compiled
 * file's own location under `dist-seed/`, which never carries the `.env`
 * file tsc doesn't copy.
 */
function readDatabaseUrlFromPrismaEnv(): string {
  const envPath = path.resolve(process.cwd(), 'prisma', '.env');
  const contents = readFileSync(envPath, 'utf8');
  const match = /^DATABASE_URL=(.*)$/m.exec(contents);
  return match ? match[1].trim() : '';
}

function assertLocalDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL || readDatabaseUrlFromPrismaEnv();
  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    throw new Error(`DATABASE_URL is not a valid connection string: "${databaseUrl}"`);
  }

  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  if (!isLocal) {
    throw new Error(
      `Refusing to reset: DATABASE_URL points at "${hostname}", not localhost/127.0.0.1. ` +
        'This reset mechanism is only ever safe to run against the local demo database.',
    );
  }
}

function main(): void {
  assertLocalDatabase();

  console.info('Resetting local demo database (migrate reset --force --skip-seed)...');
  execSync('npx prisma migrate reset --force --skip-seed', { stdio: 'inherit' });

  console.info('Reseeding demo data...');
  execSync('npm run seed', { stdio: 'inherit' });

  console.info('Demo data reset complete.');
}

main();
