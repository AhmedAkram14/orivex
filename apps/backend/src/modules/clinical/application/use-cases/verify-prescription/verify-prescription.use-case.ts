import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PrescriptionRepository } from '../../../domain/repositories/prescription.repository.js';

export interface VerifyPrescriptionQuery {
  verificationCode: string;
}

export interface VerifiedPrescriptionLineItem {
  drugName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
}

export type VerifyPrescriptionResult =
  | { valid: false }
  | {
      valid: true;
      doctorName: string;
      doctorLicenseNumber: string;
      patientName: string;
      signedAt: Date;
      lineItems: VerifiedPrescriptionLineItem[];
    };

// I12 -- Prescription digital signature and verification marker (ORIVEX
// Remaining Work Audit): the real, public read a pharmacy's QR-code scan or
// typed verification code resolves to. "Not found or not signed" and
// "found" are both real, ordinary outcomes -- never an error -- matching
// the honest boundary that a public verification endpoint is a query, not
// an authorization check on something the caller already has a right to
// see. Shows exactly what the PDF itself already prints (doctor identity,
// patient name, and the medication list a pharmacist needs to dispense
// against) -- nothing about the underlying diagnosis or clinical
// reasoning, which stays inside the authenticated record.
export class VerifyPrescriptionUseCase {
  constructor(
    private readonly prescriptionRepository: PrescriptionRepository,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
  ) {}

  async execute(query: VerifyPrescriptionQuery): Promise<VerifyPrescriptionResult> {
    const prescription = await this.prescriptionRepository.findByVerificationCode(query.verificationCode);
    if (!prescription || !prescription.getSignedAt()) {
      return { valid: false };
    }

    const session = await this.getConsultationSessionByIdUseCase.execute({
      consultationSessionId: prescription.getConsultationSessionId(),
    });
    const appointment = session
      ? await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() })
      : null;
    if (!appointment) {
      return { valid: false };
    }

    const [doctorProfile, patientProfile] = await Promise.all([
      this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: prescription.getAuthoringDoctorId() }),
      this.getPatientProfileByIdUseCase.execute({ patientProfileId: appointment.getPatientId() }),
    ]);
    if (!doctorProfile || !patientProfile) {
      return { valid: false };
    }

    const [doctorAccount, patientAccount] = await Promise.all([
      this.getAccountByIdUseCase.execute({ accountId: doctorProfile.getAccountId() }),
      this.getAccountByIdUseCase.execute({ accountId: patientProfile.getAccountId() }),
    ]);

    return {
      valid: true,
      doctorName: doctorAccount?.getUserProfile().getDisplayName().toString() ?? 'Unknown doctor',
      doctorLicenseNumber: doctorProfile.getLicenseNumber(),
      patientName: patientAccount?.getUserProfile().getDisplayName().toString() ?? 'Unknown patient',
      signedAt: prescription.getSignedAt()!,
      lineItems: prescription.getLineItems().map((item) => ({
        drugName: item.getDrugName() ?? item.getDrugCatalogId(),
        dosage: item.getDosage(),
        frequency: item.getFrequency(),
        durationDays: item.getDurationDays(),
        instructions: item.getInstructions(),
      })),
    };
  }
}
