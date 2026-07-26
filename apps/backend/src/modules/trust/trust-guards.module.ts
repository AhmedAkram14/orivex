import { Module } from '@nestjs/common';

import { CheckIdentityVerificationStatusUseCase } from './application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import { VERIFICATION_CASE_REPOSITORY } from './application/ports/tokens.js';
import type { VerificationCaseRepository } from './domain/repositories/verification-case.repository.js';
import { PrismaVerificationCaseRepository } from './infrastructure/prisma/prisma-verification-case.repository.js';
import { RequiresIdentityVerificationGuard } from './presentation/guards/requires-identity-verification.guard.js';

// Split out of TrustModule so a module that only needs
// RequiresIdentityVerificationGuard (Consultation/Payment/Asset -- Stage O.4)
// can import this alone, without pulling in TrustModule's own
// DoctorModule/PatientModule dependency and its controllers. Same reasoning
// as AuthenticationGuardsModule's split from AuthenticationModule: this
// module only ever reads VerificationCase rows (via PrismaService, globally
// available), so it can never be part of a module-graph cycle.
@Module({
  providers: [
    { provide: VERIFICATION_CASE_REPOSITORY, useClass: PrismaVerificationCaseRepository },
    {
      provide: CheckIdentityVerificationStatusUseCase,
      useFactory: (repository: VerificationCaseRepository) => new CheckIdentityVerificationStatusUseCase(repository),
      inject: [VERIFICATION_CASE_REPOSITORY],
    },
    RequiresIdentityVerificationGuard,
  ],
  exports: [VERIFICATION_CASE_REPOSITORY, CheckIdentityVerificationStatusUseCase, RequiresIdentityVerificationGuard],
})
export class TrustGuardsModule {}
