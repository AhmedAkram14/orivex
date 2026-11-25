import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import type { EnvConfig } from './core/configuration/env.schema.js';
import { buildOpenApiDocument } from './platform/openapi/openapi-document.js';
import { PinoLoggerService } from './platform/logging/pino-logger.service.js';
import { createValidationException } from './platform/validation/validation-exception-factory.js';

export async function createApp(options: { globalPrefix?: string } = {}): Promise<NestExpressApplication> {
  // Keep the original request bytes for webhook signature verification.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, rawBody: true });

  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService<EnvConfig, true>);

  // The backend runs behind a single managed reverse proxy in hosted environments.
  app.set('trust proxy', 1);
  if (options.globalPrefix) {
    app.setGlobalPrefix(options.globalPrefix);
  }
  app.use(helmet());
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
  const openApiEnabled =
    configService.get('OPENAPI_ENABLED', { infer: true }) || configService.get('NODE_ENV', { infer: true }) !== 'production';
  if (openApiEnabled) {
    SwaggerModule.setup('docs', app, buildOpenApiDocument(app));
  }

  return app;
}
