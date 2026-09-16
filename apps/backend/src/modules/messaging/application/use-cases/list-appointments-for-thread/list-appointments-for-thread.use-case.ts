import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetAppointmentsForDoctorAndPatientUseCase } from '../../../../consultation/application/use-cases/get-appointments-for-doctor-and-patient/get-appointments-for-doctor-and-patient.use-case.js';
import type { Appointment } from '../../../../consultation/domain/entities/appointment.entity.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { MessageThreadRepository } from '../../../domain/repositories/message-thread.repository.js';

import type { ListAppointmentsForThreadQuery } from './list-appointments-for-thread.query.js';

// Messages Page Overhaul, Phase 1 (added ahead of Phase 5's UI consumption
// since the underlying use case already exists): backs
// GET /message-threads/:id/appointments -- the thread-header "last
// appointment" context a later phase renders. Same ownership/404 pattern as
// ListMessagesForThreadUseCase; reuses GetAppointmentsForDoctorAndPatientUseCase
// (the same "does this pair have a real relationship" primitive
// StartOrGetMessageThreadUseCase's eligibility check is built on) rather
// than duplicating an appointment query.
export class ListAppointmentsForThreadUseCase {
  constructor(
    private readonly messageThreadRepository: MessageThreadRepository,
    private readonly getAppointmentsForDoctorAndPatientUseCase: GetAppointmentsForDoctorAndPatientUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(query: ListAppointmentsForThreadQuery): Promise<Appointment[]> {
    const thread = await this.messageThreadRepository.findById(query.threadId);
    if (!thread) {
      throw new NotFoundError(`Message thread "${query.threadId}" not found.`);
    }

    const [patientProfile, doctorProfile] = await Promise.all([
      this.getPatientProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId }),
      this.getDoctorProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId }),
    ]);
    const isPatientParty = patientProfile !== null && thread.getPatientId() === patientProfile.getId();
    const isDoctorParty = doctorProfile !== null && thread.getDoctorId() === doctorProfile.getId();
    if (!isPatientParty && !isDoctorParty) {
      throw new NotFoundError(`Message thread "${query.threadId}" not found.`);
    }

    return this.getAppointmentsForDoctorAndPatientUseCase.execute({
      doctorId: thread.getDoctorId(),
      patientId: thread.getPatientId(),
    });
  }
}
