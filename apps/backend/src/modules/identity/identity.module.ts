import { Module } from '@nestjs/common';

import { GetAccountByIdUseCase } from './application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { RegisterAccountUseCase } from './application/use-cases/register-account/register-account.use-case.js';
import { SuspendAccountUseCase } from './application/use-cases/suspend-account/suspend-account.use-case.js';

// Sprint 1.1B: application layer wired, but this module is NOT yet
// registered in AppModule — RegisterAccountUseCase/SuspendAccountUseCase/
// GetAccountByIdUseCase all require ACCOUNT_REPOSITORY and
// DOMAIN_EVENT_DISPATCHER providers (tokens.ts) that nothing binds to yet,
// since no infrastructure implementation exists. Registering this module
// into the running app before an infrastructure module supplies those
// bindings would fail at Nest's dependency-resolution time.
@Module({
  providers: [RegisterAccountUseCase, SuspendAccountUseCase, GetAccountByIdUseCase],
  exports: [RegisterAccountUseCase, SuspendAccountUseCase, GetAccountByIdUseCase],
})
export class IdentityModule {}
