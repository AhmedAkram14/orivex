import { Global, Module } from '@nestjs/common';

import { PinoLoggerService } from './pino-logger.service.js';

// Global so any feature module (Identity, and every one after it) can inject
// PinoLoggerService without needing AppModule to explicitly re-export it —
// modules imported into AppModule don't inherit AppModule's own local
// providers, only what a module they import itself exports.
@Global()
@Module({
  providers: [PinoLoggerService],
  exports: [PinoLoggerService],
})
export class LoggingModule {}
