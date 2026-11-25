import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';

import type { EnvConfig } from './core/configuration/env.schema.js';
import { bootstrapErrorReporting } from './platform/observability/error-reporting.js';
import { bootstrapTracing } from './platform/observability/tracing.js';
import { PinoLoggerService } from './platform/logging/pino-logger.service.js';

async function bootstrap(): Promise<void> {
  // Initialize instrumentation before importing the Nest module graph.
  const tracing = bootstrapTracing();
  bootstrapErrorReporting();

  const { createApp } = await import('./app.factory.js');
  const app = await createApp();
  const logger = app.get(PinoLoggerService);
  const configService = app.get(ConfigService<EnvConfig, true>);

  app.enableShutdownHooks();
  process.on('SIGTERM', () => void tracing.shutdown());
  process.on('SIGINT', () => void tracing.shutdown());

  const port = configService.get('PORT', { infer: true });
  await app.listen(port);
  logger.log(`Orivex backend listening on port ${port}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal error during bootstrap', error);
  process.exitCode = 1;
});
