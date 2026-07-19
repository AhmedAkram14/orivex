import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import type { EnvConfig } from './core/configuration/env.schema.js';
import { buildOpenApiDocument } from './platform/openapi/openapi-document.js';
import { bootstrapErrorReporting } from './platform/observability/error-reporting.js';
import { bootstrapTracing } from './platform/observability/tracing.js';
import { PinoLoggerService } from './platform/logging/pino-logger.service.js';
import { createValidationException } from './platform/validation/validation-exception-factory.js';

async function bootstrap(): Promise<void> {
  // Both must run before any instrumented module is imported/instantiated --
  // tracing patches http/express/@prisma/client at the module-loader level,
  // and Sentry needs to be initialized before requests can flow through it.
  const tracing = bootstrapTracing();
  bootstrapErrorReporting();

  // rawBody: true keeps the untouched request Buffer available on
  // req.rawBody alongside Nest's normal parsed req.body -- required by the
  // Stripe webhook receiver (payment-webhook.controller.ts) to verify the
  // signature, which is computed over the exact raw bytes Stripe sent.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService<EnvConfig, true>);

  app.use(helmet());
  // Required for AuthenticationModule to read the httpOnly refresh-token
  // cookie (req.cookies) -- unpopulated without this middleware.
  app.use(cookieParser());
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
  const openApiEnabled = configService.get('OPENAPI_ENABLED', { infer: true }) || configService.get('NODE_ENV', { infer: true }) !== 'production';
  if (openApiEnabled) {
    SwaggerModule.setup('docs', app, buildOpenApiDocument(app));
  }

  app.enableShutdownHooks();
  // Flushes any buffered spans before the process actually exits --
  // separate from Nest's own onModuleDestroy hooks above, since the
  // tracing SDK is initialized outside the Nest DI container.
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
