import { ForbiddenError, NotFoundError } from '../../../../shared/errors/app-error.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { Account } from '../../../identity/domain/entities/account.entity.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import type { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import { GetConsentStateUseCase } from '../../../trust/application/use-cases/get-consent-state/get-consent-state.use-case.js';
import { GENERAL_CONSENT_SCOPE_CODE } from '../../../trust/domain/constants/consent-scope-codes.js';
import { ConsentState } from '../../../trust/domain/enums/consent-state.enum.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import { GetAppointmentsForDoctorAndPatientUseCase } from '../use-cases/get-appointments-for-doctor-and-patient/get-appointments-for-doctor-and-patient.use-case.js';

export interface TreatingRelationshipResult {
  doctorProfile: DoctorProfile;
  profile: PatientProfile;
  account: Account;
  ownAppointments: Appointment[];
}

// Doctor Patient Chart plan, decision 8: the doctor<->patient treating-
// relationship + consent check, previously duplicated between
// DoctorPatientChartController.requireRelationship (ClinicalModule) and
// HealthGraphController.ensureReadableByCaller's doctor branch
// (ClinicalModule). Owned here, in ConsultationModule, because Appointment
// -- the aggregate that defines what a "treating relationship" even is --
// already lives here.
//
// Semantics preserved exactly from both prior copies: an ownership-safe 404
// when no relationship exists at all (never reveal a patient id to a
// doctor who never had a real encounter with them), and a distinct 403
// CONSENT_NOT_GRANTED when a real relationship's general consent has since
// been revoked (the patient's existence to this doctor is already
// legitimate at that point; access is just blocked).
export class TreatingRelationshipService {
  constructor(
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getAppointmentsForDoctorAndPatientUseCase: GetAppointmentsForDoctorAndPatientUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly getConsentStateUseCase: GetConsentStateUseCase,
  ) {}

  async assertActiveRelationship(doctorAccountId: string, patientId: string): Promise<TreatingRelationshipResult> {
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: doctorAccountId });
    if (!doctorProfile) {
      throw new NotFoundError(`Patient "${patientId}" not found.`);
    }

    const ownAppointments = await this.getAppointmentsForDoctorAndPatientUseCase.execute({
      doctorId: doctorProfile.getId(),
      patientId,
    });
    if (ownAppointments.length === 0) {
      throw new NotFoundError(`Patient "${patientId}" not found.`);
    }

    const consentState = await this.getConsentStateUseCase.execute({
      patientId,
      doctorId: doctorProfile.getId(),
      scopeCode: GENERAL_CONSENT_SCOPE_CODE,
    });
    if (consentState === ConsentState.Revoked) {
      throw new ForbiddenError('This doctor does not have consent to view the requested data.', 'CONSENT_NOT_GRANTED');
    }

    const profile = await this.getPatientProfileByIdUseCase.execute({ patientProfileId: patientId });
    if (!profile) {
      throw new NotFoundError(`Patient "${patientId}" not found.`);
    }
    const account = await this.getAccountByIdUseCase.execute({ accountId: profile.getAccountId() });
    if (!account) {
      throw new NotFoundError(`Patient "${patientId}" not found.`);
    }

    return { doctorProfile, profile, account, ownAppointments };
  }
}
