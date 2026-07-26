import { ConflictError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { PatientProfile } from '../../../domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../domain/repositories/patient-profile.repository.js';

import type { CreatePatientProfileCommand } from './create-patient-profile.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// patient.module.ts only.
//
// Orchestrates: verify the owning Account exists (via IdentityModule's own
// exported use case — module-to-module calls only through a published
// interface, never another module's repository) -> uniqueness check (one
// profile per account) -> PatientProfile.create() -> persist -> dispatch.
//
// docs/10-backend-architecture.md describes this creation as an
// AccountCreated event subscriber ("PatientModule (subscriber) creates an
// empty PatientProfile shell"). That wiring is deliberately deferred: the
// shared DomainEventDispatcher port only exposes dispatch(), not
// subscription, and extending it is an intentional future infrastructure
// sprint's concern, not this one's. For now this use case is called
// explicitly and is not yet wired to any subscriber or endpoint.
export class CreatePatientProfileUseCase {
  constructor(
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
  ) {}

  async execute(command: CreatePatientProfileCommand): Promise<PatientProfile> {
    const account = await this.getAccountByIdUseCase.execute({ accountId: command.accountId });
    if (!account) {
      throw new NotFoundError(`Account "${command.accountId}" not found.`);
    }

    const existing = await this.patientProfileRepository.findByAccountId(command.accountId);
    if (existing) {
      throw new ConflictError('A patient profile already exists for this account.');
    }

    const profile = PatientProfile.create({
      accountId: command.accountId,
      emergencyContacts: command.emergencyContacts,
    });

    await this.patientProfileRepository.save(profile);
    await this.eventDispatcher.dispatch(profile.releaseDomainEvents());

    return profile;
  }
}
