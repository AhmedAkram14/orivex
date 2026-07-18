import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';

import { ACCOUNT_REPOSITORY } from './application/ports/tokens.js';
import { GetAccountByEmailUseCase } from './application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import { GetAccountByIdUseCase } from './application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { RegisterAccountUseCase } from './application/use-cases/register-account/register-account.use-case.js';
import { SuspendAccountUseCase } from './application/use-cases/suspend-account/suspend-account.use-case.js';
import type { AccountRepository } from './domain/repositories/account.repository.js';
import { PrismaAccountRepository } from './infrastructure/prisma/prisma-account.repository.js';
import { AccountController } from './presentation/controllers/account.controller.js';

// The use cases themselves (application/use-cases/**) are plain TypeScript
// classes with zero NestJS dependency — no @Injectable(), no @Inject(). All
// framework-specific dependency injection is confined to this module file:
// factory providers construct each use case manually, resolving
// ACCOUNT_REPOSITORY (this module) and DOMAIN_EVENT_DISPATCHER (shared,
// bound once by the global EventsModule) by token.
@Module({
  imports: [AuthenticationGuardsModule],
  controllers: [AccountController],
  providers: [
    { provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository },
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
    {
      provide: GetAccountByEmailUseCase,
      useFactory: (accountRepository: AccountRepository) => new GetAccountByEmailUseCase(accountRepository),
      inject: [ACCOUNT_REPOSITORY],
    },
  ],
  exports: [RegisterAccountUseCase, SuspendAccountUseCase, GetAccountByIdUseCase, GetAccountByEmailUseCase],
})
export class IdentityModule {}
