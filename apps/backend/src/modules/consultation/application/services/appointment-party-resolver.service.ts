import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';

// Dispute System Hardening Phase 1: the "verify caller is really the patient
// or doctor on this appointment" check, previously duplicated inline in
// RaiseDisputeUseCase and SendMessageUseCase (each resolving both profiles
// and comparing ids by hand). Extracted here, mirroring
// TreatingRelationshipService's own shape (a small, focused service in
// ConsultationModule's application layer, since Appointment -- the aggregate
// that defines what a "party" even is -- lives here), so DisputeController's
// by-id ownership check and RaiseDisputeUseCase's own party check share one
// implementation instead of a third inline copy.
export class AppointmentPartyResolver {
  constructor(
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async isAccountPartyToAppointment(appointment: Appointment, accountId: string): Promise<boolean> {
    const [patientProfile, doctorProfile] = await Promise.all([
      this.getPatientProfileByAccountIdUseCase.execute({ accountId }),
      this.getDoctorProfileByAccountIdUseCase.execute({ accountId }),
    ]);
    const isPatientParty = patientProfile !== null && appointment.getPatientId() === patientProfile.getId();
    const isDoctorParty = doctorProfile !== null && appointment.getDoctorId() === doctorProfile.getId();
    return isPatientParty || isDoctorParty;
  }
}
