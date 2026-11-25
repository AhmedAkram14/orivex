import type { Request, Response } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';

let appPromise: Promise<NestExpressApplication> | undefined;

async function getApp(): Promise<NestExpressApplication> {
  if (!appPromise) {
    appPromise = (async () => {
      const { bootstrapErrorReporting } = await import('../dist/platform/observability/error-reporting.js');
      const { bootstrapTracing } = await import('../dist/platform/observability/tracing.js');
      const tracing = bootstrapTracing();
      bootstrapErrorReporting();
      process.once('SIGTERM', () => void tracing.shutdown());

      const { createApp } = await import('../dist/app.factory.js');
      const app = await createApp({ globalPrefix: 'api' });
      await app.init();
      app.enableShutdownHooks();
      return app;
    })();
  }

  return appPromise;
}

export default async function handler(request: Request, response: Response): Promise<void> {
  const app = await getApp();
  const expressHandler = app.getHttpAdapter().getInstance() as unknown as (request: Request, response: Response) => void;
  expressHandler(request, response);
}
