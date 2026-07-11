import { Global, Module } from '@nestjs/common';

import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';

import { InProcessDomainEventDispatcher } from './in-process-domain-event-dispatcher.js';

// Global so every feature module binds to the same dispatcher instance via
// the shared DOMAIN_EVENT_DISPATCHER token, without redeclaring the provider
// in each module.
@Global()
@Module({
  providers: [{ provide: DOMAIN_EVENT_DISPATCHER, useClass: InProcessDomainEventDispatcher }],
  exports: [DOMAIN_EVENT_DISPATCHER],
})
export class EventsModule {}
