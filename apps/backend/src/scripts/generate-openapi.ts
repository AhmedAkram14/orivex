import 'reflect-metadata';

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module.js';
import { buildOpenApiDocument } from '../platform/openapi/openapi-document.js';

// Standalone generation for CI/local use (`pnpm openapi:generate`) --
// writes the same document the live GET /docs endpoint serves to a static
// file, so it can be committed, diffed in review, or fed to client
// generators without a running server.
async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = buildOpenApiDocument(app);

  const outputPath = path.resolve(fileURLToPath(import.meta.url), '../../../openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI document written to ${outputPath}`);

  await app.close();
}

main().catch((error: unknown) => {
  console.error('Failed to generate OpenAPI document', error);
  process.exitCode = 1;
});
