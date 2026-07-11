import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './env.schema.js';

// .env files are committed at the repo root (shared across backend/frontend,
// per docs/13-engineering-bootstrap.md Section 8), not per-app, so the path
// is resolved relative to this file rather than assumed from process.cwd().
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../../..');
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
