import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import type { EnvConfig } from './core/configuration/env.schema.js';
import { bootstrapTracing } from './platform/observability/tracing.js';
import { PinoLoggerService } from './platform/logging/pino-logger.service.js';
import { createValidationException } from './platform/validation/validation-exception-factory.js';

async function bootstrap(): Promise<void> {
  bootstrapTracing();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService<EnvConfig, true>);

  app.use(helmet());
  app.enableCors({
    origin: configService
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: createValidationException,
    }),
  );
  app.enableShutdownHooks();

  const port = configService.get('PORT', { infer: true });
  await app.listen(port);
  logger.log(`Orivex backend listening on port ${port}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal error during bootstrap', error);
  process.exitCode = 1;
});
