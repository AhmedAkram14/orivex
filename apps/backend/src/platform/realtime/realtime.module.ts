import { Global, Module } from '@nestjs/common';

import { AuthenticationGuardsModule } from '../../modules/authentication/authentication-guards.module.js';

import { REALTIME_EMITTER } from './ports/tokens.js';
import { RealtimeGateway } from './realtime.gateway.js';

// Global so every feature module (NotificationModule, ConsultationModule)
// binds to the same live gateway instance via REALTIME_EMITTER, without
// redeclaring the provider in each -- mirrors EventsModule's own
// DOMAIN_EVENT_DISPATCHER precedent exactly.
@Global()
@Module({
  imports: [AuthenticationGuardsModule],
  providers: [RealtimeGateway, { provide: REALTIME_EMITTER, useExisting: RealtimeGateway }],
  exports: [REALTIME_EMITTER],
})
export class RealtimeModule {}
