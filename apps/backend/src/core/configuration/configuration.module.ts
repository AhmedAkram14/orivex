import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './env.schema.js';

// .env files are committed at the repo root (shared across backend/frontend,
// per docs/13-engineering-bootstrap.md Section 8), not per-app, so the path
// is resolved relative to this file rather than assumed from process.cwd().
// Walked up to the `pnpm-workspace.yaml` marker rather than a hardcoded
// `../../../../..` depth: the normal build (`tsc`, rootDir "src") and the
// Prisma seed build (`tsconfig.seed.json`, rootDir ".") emit this file at
// different depths (`dist/core/configuration/` vs `dist-seed/src/core/
// configuration/`), so a fixed depth is only ever correct for one of them.
function findRepoRoot(startDir: string): string {
  let dir = startDir;
  while (!fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not locate repo root (pnpm-workspace.yaml) above ${startDir}`);
    }
    dir = parent;
  }
  return dir;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(currentDir);
const nodeEnv = process.env.NODE_ENV ?? 'development';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: [path.join(repoRoot, '.env.local'), path.join(repoRoot, `.env.${nodeEnv}`)],
    }),
  ],
})
export class ConfigurationModule {}
