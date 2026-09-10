import { ConflictError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { Dispute } from '../../../domain/entities/dispute.entity.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

import type { RaiseDisputeCommand } from './raise-dispute.command.js';

// I11 -- Admin dispute resolution (ORIVEX Remaining Work Audit): either
// genuine party on the appointment can raise a dispute -- same
// "verify caller is really the patient or doctor on this appointment, 404
// otherwise" pattern StartOrGetMessageThreadUseCase established for I7.
// One dispute per appointment (the schema's own unique index on
// appointmentId), enforced here too so the caller gets a real 409 instead
// of a raw constraint-violation 500.
export class RaiseDisputeUseCase {
  constructor(
    private readonly disputeRepository: DisputeRepository,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(command: RaiseDisputeCommand): Promise<Dispute> {
    const appointment = await this.appointmentRepository.findById(command.appointmentId);
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
      throw new NotFoundError(`Appointment "${command.appointmentId}" not found.`);
    }

    const existing = await this.disputeRepository.findByAppointmentId(command.appointmentId);
    if (existing) {
      throw new ConflictError('A dispute has already been raised for this appointment.');
    }

    const dispute = Dispute.raise({
      appointmentId: command.appointmentId,
      raisedByAccountId: command.callerAccountId,
      reason: command.reason,
    });
    await this.disputeRepository.save(dispute);
    return dispute;
  }
}
