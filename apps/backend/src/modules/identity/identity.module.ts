import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from './application/ports/domain-event-dispatcher.port.js';
import { ACCOUNT_REPOSITORY, DOMAIN_EVENT_DISPATCHER } from './application/ports/tokens.js';
import { GetAccountByIdUseCase } from './application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { RegisterAccountUseCase } from './application/use-cases/register-account/register-account.use-case.js';
import { SuspendAccountUseCase } from './application/use-cases/suspend-account/suspend-account.use-case.js';
import type { AccountRepository } from './domain/repositories/account.repository.js';
import { InProcessDomainEventDispatcher } from './infrastructure/events/in-process-domain-event-dispatcher.js';
import { PrismaAccountRepository } from './infrastructure/prisma/prisma-account.repository.js';
import { AccountController } from './presentation/controllers/account.controller.js';

// The use cases themselves (application/use-cases/**) are plain TypeScript
// classes with zero NestJS dependency — no @Injectable(), no @Inject(). All
// framework-specific dependency injection is confined to this module file:
// factory providers construct each use case manually, resolving
// ACCOUNT_REPOSITORY/DOMAIN_EVENT_DISPATCHER by token.
//
// Sprint 1.1C: infrastructure bindings now exist — ACCOUNT_REPOSITORY binds
// to a real Prisma-backed repository, DOMAIN_EVENT_DISPATCHER to a simple
// in-process event emitter. This module is registered in AppModule for the
// first time as of this sprint.
@Module({
  controllers: [AccountController],
  providers: [
    { provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository },
    { provide: DOMAIN_EVENT_DISPATCHER, useClass: InProcessDomainEventDispatcher },
    {
      provide: RegisterAccountUseCase,
      useFactory: (accountRepository: AccountRepository, eventDispatcher: DomainEventDispatcher) =>
        new RegisterAccountUseCase(accountRepository, eventDispatcher),
      inject: [ACCOUNT_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: SuspendAccountUseCase,
      useFactory: (accountRepository: AccountRepository, eventDispatcher: DomainEventDispatcher) =>
        new SuspendAccountUseCase(accountRepository, eventDispatcher),
      inject: [ACCOUNT_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: GetAccountByIdUseCase,
      useFactory: (accountRepository: AccountRepository) => new GetAccountByIdUseCase(accountRepository),
      inject: [ACCOUNT_REPOSITORY],
    },
  ],
  exports: [RegisterAccountUseCase, SuspendAccountUseCase, GetAccountByIdUseCase],
})
export class IdentityModule {}
