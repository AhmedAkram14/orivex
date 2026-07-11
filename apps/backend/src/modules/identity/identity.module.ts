import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from './application/ports/domain-event-dispatcher.port.js';
import { ACCOUNT_REPOSITORY, DOMAIN_EVENT_DISPATCHER } from './application/ports/tokens.js';
import { GetAccountByIdUseCase } from './application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { RegisterAccountUseCase } from './application/use-cases/register-account/register-account.use-case.js';
import { SuspendAccountUseCase } from './application/use-cases/suspend-account/suspend-account.use-case.js';
import type { AccountRepository } from './domain/repositories/account.repository.js';

// The use cases themselves (application/use-cases/**) are plain TypeScript
// classes with zero NestJS dependency — no @Injectable(), no @Inject(). All
// framework-specific dependency injection is confined to this module file:
// factory providers construct each use case manually, resolving
// ACCOUNT_REPOSITORY/DOMAIN_EVENT_DISPATCHER by token. This keeps the
// application layer testable and framework-agnostic (see the .test.ts files,
// which instantiate use cases directly with fakes, no Nest testing module).
//
// Infrastructure bindings for ACCOUNT_REPOSITORY (a Prisma-backed
// AccountRepository) and DOMAIN_EVENT_DISPATCHER (an event-dispatcher
// adapter) do not exist yet — they are Sprint 1.1C's job. Until then, this
// module is intentionally NOT registered in AppModule: nothing binds those
// tokens yet, and doing so would fail at Nest's dependency-resolution time,
// not at compile time.
@Module({
  providers: [
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
