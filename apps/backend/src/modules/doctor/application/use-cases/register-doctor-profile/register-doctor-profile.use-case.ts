import { ConflictError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { DoctorProfile } from '../../../domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../domain/repositories/doctor-profile.repository.js';

import type { RegisterDoctorProfileCommand } from './register-doctor-profile.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// doctor.module.ts only.
//
// Orchestrates: verify the owning Account exists (via IdentityModule's own
// exported use case — module-to-module calls only through a published
// interface, never another module's repository) -> uniqueness check (one
// profile per account) -> DoctorProfile.register() -> persist -> dispatch.
export class RegisterDoctorProfileUseCase {
  constructor(
    private readonly doctorProfileRepository: DoctorProfileRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
  ) {}

  async execute(command: RegisterDoctorProfileCommand): Promise<DoctorProfile> {
    const account = await this.getAccountByIdUseCase.execute({ accountId: command.accountId });
    if (!account) {
      throw new NotFoundError(`Account "${command.accountId}" not found.`);
    }

    const existing = await this.doctorProfileRepository.findByAccountId(command.accountId);
    if (existing) {
      throw new ConflictError('A doctor profile already exists for this account.');
    }

    const profile = DoctorProfile.register({
      accountId: command.accountId,
      licenseNumber: command.licenseNumber,
      specialty: command.specialty,
      biography: command.biography,
      yearsOfExperience: command.yearsOfExperience,
      languages: command.languages,
      consultationFeeAmount: command.consultationFeeAmount,
      hospitalId: command.hospitalId,
      publications: command.publications,
      awards: command.awards,
      specialtyId: command.specialtyId,
      professionalRank: command.professionalRank,
      licenseExpiryDate: command.licenseExpiryDate,
      departmentId: command.departmentId,
    });

    await this.doctorProfileRepository.save(profile);
    await this.eventDispatcher.dispatch(profile.releaseDomainEvents());

    return profile;
  }
}
