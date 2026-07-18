import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

// Single shared builder so the live /docs endpoint (main.ts) and the
// standalone generator script (scripts/generate-openapi.ts) always produce
// the identical document -- one definition of the API surface, not two
// that can drift apart.
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('ORIVEX API')
    .setDescription(
      'Enterprise healthcare platform API. Generated directly from the running NestJS controllers/DTOs ' +
        '(Production Readiness Audit -- "add OpenAPI generation"); docs/11-api-contracts.md remains the ' +
        'authoritative hand-written contract for design discussion, this document is its generated, ' +
        'always-in-sync counterpart for tooling (client generation, Postman/Insomnia import, etc).',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}
