import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { MessageThread } from '../../../domain/entities/message-thread.entity.js';
import type { MessageThreadRepository } from '../../../domain/repositories/message-thread.repository.js';

import type { StartOrGetMessageThreadCommand } from './start-or-get-message-thread.command.js';

// I7 -- Messaging. One thread per Appointment, lazily created the first
// time either party opens it -- mirrors ConfirmAppointmentUseCase's own
// "reuse if it already exists" idiom for ConsultationSession. The caller
// must genuinely be the patient or doctor on this appointment; nothing
// else can start or read a thread that isn't theirs.
export class StartOrGetMessageThreadUseCase {
  constructor(
    private readonly messageThreadRepository: MessageThreadRepository,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(command: StartOrGetMessageThreadCommand): Promise<MessageThread> {
    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: command.appointmentId });
    if (!appointment) {
      throw new NotFoundError(`Appointment "${command.appointmentId}" not found.`);
    }

    const [patientProfile, doctorProfile] = await Promise.all([
      this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId }),
      this.getDoctorProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId }),
    ]);
    const isPatientParty = patientProfile !== null && appointment.getPatientId() === patientProfile.getId();
    const isDoctorParty = doctorProfile !== null && appointment.getDoctorId() === doctorProfile.getId();
    if (!isPatientParty && !isDoctorParty) {
      // 404, not 403 -- never confirms to a caller whether an appointment id
      // belonging to someone else exists at all, matching this codebase's
      // "never leak existence" convention.
      throw new NotFoundError(`Appointment "${command.appointmentId}" not found.`);
    }

    const existing = await this.messageThreadRepository.findByAppointmentId(command.appointmentId);
    if (existing) {
      return existing;
    }

    const thread = MessageThread.start({
      appointmentId: command.appointmentId,
      patientId: appointment.getPatientId(),
      doctorId: appointment.getDoctorId(),
    });
    await this.messageThreadRepository.save(thread);
    return thread;
  }
}
