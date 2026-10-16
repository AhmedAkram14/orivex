/**
 * Demo timeline -- entry point.
 *
 *   npm run demo:seed                       # plan + apply, anchored at the current hour (Cairo)
 *   npm run demo:seed -- --anchor "2026-10-14 11:00"
 *   npm run demo:seed -- --dry-run          # print what would change, write nothing
 *   npm run demo:check                      # invariant suite only
 *
 * Requires the identity seed (`npm run seed`) to have created the demo
 * accounts. Refuses any non-local database unless explicitly approved
 * (see assertSafeDatabase).
 */
import 'reflect-metadata';

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { S3Client } from '@aws-sdk/client-s3';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { INestApplicationContext } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

import { AppModule } from '../../src/app.module.js';
import { PRESCRIPTION_SIGNER } from '../../src/modules/clinical/application/ports/tokens.js';
import type { PrescriptionSignerPort } from '../../src/modules/clinical/application/ports/prescription-signer.port.js';
import { PrismaService } from '../../src/platform/database/prisma.service.js';
import { GetBookableAvailabilityQuery } from '../../src/modules/scheduling/application/use-cases/get-bookable-availability/get-bookable-availability.query.js';
import { GetBookableAvailabilityUseCase } from '../../src/modules/scheduling/application/use-cases/get-bookable-availability/get-bookable-availability.use-case.js';

import { applyPlan, scopeOf, type Storage } from './apply.js';
import { runChecks } from './checks.js';
import { MS_PER_DAY, MS_PER_HOUR, assertSafeDatabase, parseAnchor, toCairo } from './core.js';
import { loadPopulation, type DemoPopulation } from './load.js';
import { buildPlan } from './plan/planner.js';

export interface Args {
  dryRun: boolean;
  checkOnly: boolean;
  anchor?: string;
  allowRemote: boolean;
  skipStorage: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, checkOnly: false, allowRemote: false, skipStorage: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') args.dryRun = true;
    else if (value === '--check') args.checkOnly = true;
    else if (value === '--allow-remote') args.allowRemote = true;
    else if (value === '--skip-storage') args.skipStorage = true;
    else if (value === '--anchor') args.anchor = argv[++index];
    else if (value.startsWith('--anchor=')) args.anchor = value.slice('--anchor='.length);
  }
  args.anchor ??= process.env.DEMO_ANCHOR_DATE;
  return args;
}

/** DATABASE_URL exactly as ConfigModule resolves it (process env, then .env.local, then .env.<NODE_ENV>), read BEFORE anything connects. */
function resolveDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const repoRoot = path.resolve(process.cwd(), '..', '..');
  for (const file of ['.env.local', `.env.${process.env.NODE_ENV ?? 'development'}`]) {
    try {
      const match = /^DATABASE_URL=(.*)$/m.exec(readFileSync(path.join(repoRoot, file), 'utf8'));
      if (match) return match[1].trim();
    } catch {
      // file absent
    }
  }
  return undefined;
}

function storageFrom(app: INestApplicationContext): Storage {
  const config = app.get(ConfigService);
  return {
    bucket: config.get<string>('S3_BUCKET') ?? '',
    client: new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION'),
      forcePathStyle: String(config.get('S3_FORCE_PATH_STYLE')) === 'true',
      credentials: { accessKeyId: config.get<string>('S3_ACCESS_KEY_ID') ?? '', secretAccessKey: config.get<string>('S3_SECRET_ACCESS_KEY') ?? '' },
    }),
  };
}

async function scopedInputs(prisma: PrismaClient, population: DemoPopulation) {
  const accountIds = [population.adminAccountId, ...[...population.doctors.values()].map((d) => d.accountId), ...[...population.patients.values()].map((p) => p.accountId)];
  if (population.hospitalAdminAccountId) accountIds.push(population.hospitalAdminAccountId);
  const identityAssets = await prisma.mediaAsset.findMany({
    where: { ownerAccountId: { in: accountIds }, purpose: { in: ['national_id_front', 'national_id_back', 'selfie_with_id', 'medical_license'] } },
    select: { id: true, ownerAccountId: true, purpose: true, storageKey: true, contentType: true },
  });
  const seedNotifications = await prisma.notification.findMany({
    where: {
      accountId: { in: accountIds },
      title: { in: ['Welcome to Orivex', 'Verification approved', 'Verification rejected', 'Welcome, Doctor', 'Verification suspended', 'New verification application submitted'] },
    },
    select: { id: true, accountId: true, title: true, actionUrl: true },
  });
  // Only identity-seed notifications (v4 ids) are re-timed; timeline rows are owned by the planner.
  const hospitals = await prisma.hospital.findMany({ select: { id: true, name: true, address: true } });
  const doctorProfileIds = [...population.doctors.values()].map((d) => d.profileId);
  const portfolio = [
    ...(await prisma.portfolioPublication.findMany({ where: { doctorProfileId: { in: doctorProfileIds } }, select: { doctorProfileId: true, title: true, id: true } })),
    ...(await prisma.portfolioAward.findMany({ where: { doctorProfileId: { in: doctorProfileIds } }, select: { doctorProfileId: true, title: true, id: true } })),
    ...(await prisma.portfolioWorkExperience.findMany({ where: { doctorProfileId: { in: doctorProfileIds } }, select: { doctorProfileId: true, organizationName: true, id: true } })).map((row) => ({
      doctorProfileId: row.doctorProfileId,
      title: row.organizationName,
      id: row.id,
    })),
  ].filter((row) => !/^[0-9a-f]{8}-[0-9a-f]{4}-5/i.test(row.id));
  return { identityAssets, seedNotifications: seedNotifications.filter((n) => !/^[0-9a-f]{8}-[0-9a-f]{4}-5/i.test(n.id)), hospitals, portfolio };
}

function printTable(rows: (string | number)[][]): void {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => String(row[column]).length)));
  for (const row of rows) console.info(`  ${row.map((cell, column) => String(cell).padEnd(widths[column])).join('  ')}`);
}

/** True when the demo timeline may write: a local database, or a remote one the owner explicitly approved. */
export function isDemoTimelineAllowed(): boolean {
  try {
    assertSafeDatabase(resolveDatabaseUrl(), process.env.DEMO_REMOTE_APPROVED === 'yes');
    return true;
  } catch {
    return false;
  }
}

export async function runDemoTimeline(app: INestApplicationContext, args: Args): Promise<boolean> {
  // Defence in depth: every entry point re-checks the target database.
  assertSafeDatabase(resolveDatabaseUrl(), args.allowRemote || process.env.DEMO_REMOTE_APPROVED === 'yes');
  const prisma = app.get(PrismaService) as unknown as PrismaClient;
  const anchor = parseAnchor(args.anchor);
  const cairo = toCairo(anchor);
  console.info(`Demo timeline anchor: ${anchor.toISOString()} (Cairo ${cairo.year}-${String(cairo.month + 1).padStart(2, '0')}-${String(cairo.day).padStart(2, '0')} ${String(cairo.hours).padStart(2, '0')}:${String(cairo.minutes).padStart(2, '0')})${args.dryRun ? '  [DRY RUN]' : ''}`);

  const population = await loadPopulation(prisma);
  if (population.missing.length > 0) {
    console.warn(`  ! ${population.missing.length} demo accounts missing (run \`npm run seed\` first): ${population.missing.join(', ')}`);
  }
  const storage = args.skipStorage ? undefined : storageFrom(app);

  if (!args.checkOnly) {
    const signer = app.get<PrescriptionSignerPort>(PRESCRIPTION_SIGNER);
    const inputs = await scopedInputs(prisma, population);
    const plan = buildPlan({
      anchor,
      population,
      sign: (request) => signer.sign(request),
      identityAssets: inputs.identityAssets,
      seedNotifications: inputs.seedNotifications,
      hospitals: inputs.hospitals,
      existingPortfolio: inputs.portfolio,
    });

    console.info('Plan:');
    console.info(`  appointments by status: ${JSON.stringify(plan.stats.appointmentsByStatus)}`);
    console.info(`  completed by doctor:    ${JSON.stringify(plan.stats.completedByDoctor)}`);
    console.info(`  upcoming by doctor:     ${JSON.stringify(plan.stats.upcomingByDoctor)}`);
    for (const warning of plan.stats.warnings) console.warn(`  ! ${warning}`);

    const report = await applyPlan(prisma, plan, scopeOf(population), { dryRun: args.dryRun, storage, log: (line) => console.info(line) });
    console.info(args.dryRun ? 'Would write:' : 'Wrote:');
    printTable([
      ['table', 'planned', 'created', 'updated', 'unchanged', 'pruned', 'blocked'],
      ...report.tables.filter((t) => t.planned + t.pruned > 0).map((t) => [t.table, t.planned, t.created, t.updated, t.unchanged, t.pruned, t.pruneBlocked]),
    ]);
    console.info(`  patches: ${report.patches.applied} applied, ${report.patches.unchanged} unchanged; open windows removed: ${report.overlappingOpenWindowsRemoved}`);

    // Bookable slots for the next two weeks, materialised through the same use case a
    // patient's booking page calls -- only meaningful when the anchor is "now".
    if (!args.dryRun && Math.abs(anchor.getTime() - Date.now()) < 6 * MS_PER_HOUR) {
      const bookable = app.get(GetBookableAvailabilityUseCase);
      const from = new Date();
      const to = new Date(from.getTime() + 14 * MS_PER_DAY);
      let opened = 0;
      for (const doctor of population.doctors.values()) {
        opened += (await bookable.execute(new GetBookableAvailabilityQuery({ doctorId: doctor.profileId, from, to }))).length;
      }
      console.info(`  bookable slots open in the next 14 days: ${opened}`);
    }
  }

  if (args.dryRun) return true;
  const results = await runChecks(prisma, population, anchor, storage);
  console.info('Checks:');
  for (const result of results) {
    console.info(`  ${result.passed ? 'PASS' : result.severity === 'coverage' ? 'WARN' : 'FAIL'}  ${result.id}  ${result.name}  (${result.checked} checked)`);
    for (const failure of result.failures.slice(0, 8)) console.info(`        - ${failure}`);
  }
  return results.every((result) => result.passed || result.severity === 'coverage');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  assertSafeDatabase(resolveDatabaseUrl(), args.allowRemote);
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  try {
    const ok = await runDemoTimeline(app, args);
    if (!ok) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

const invokedDirectly = process.argv[1] && /demo[\\/]run\.js$/.test(process.argv[1]);
if (invokedDirectly) {
  main()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => process.exit(process.exitCode ?? 0));
}
