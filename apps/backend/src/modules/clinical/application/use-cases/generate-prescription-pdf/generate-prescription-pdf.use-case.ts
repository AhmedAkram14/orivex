import { NotFoundError, ValidationError } from '../../../../../shared/errors/app-error.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { PrescriptionPdfGeneratorPort } from '../../../application/ports/prescription-pdf-generator.port.js';
import type { PrescriptionRepository } from '../../../domain/repositories/prescription.repository.js';

export interface GeneratePrescriptionPdfQuery {
  prescriptionId: string;
  /** Backend-composed absolute link to the verify page/endpoint -- built by the controller from configured FRONTEND_URL, not this use case's concern. */
  verificationUrl: string;
}

// I12 -- Prescription PDF generation: composes the signed Prescription with
// the doctor/patient identity a pharmacist needs to read on the document
// (same "resolve name via profile -> account" pattern
// VerifyPrescriptionUseCase and ListPaymentTransactionsForAdminUseCase both
// already use), then delegates the actual rendering to
// PrescriptionPdfGeneratorPort.
export class GeneratePrescriptionPdfUseCase {
  constructor(
    private readonly prescriptionRepository: PrescriptionRepository,
    private readonly pdfGenerator: PrescriptionPdfGeneratorPort,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
  ) {}

  async execute(query: GeneratePrescriptionPdfQuery): Promise<Buffer> {
    const prescription = await this.prescriptionRepository.findById(query.prescriptionId);
    if (!prescription) {
      throw new NotFoundError(`Prescription "${query.prescriptionId}" not found.`);
    }
    const signedAt = prescription.getSignedAt();
    const verificationCode = prescription.getVerificationCode();
    if (!signedAt || !verificationCode) {
      throw new ValidationError('Only a signed prescription can be exported as a PDF.');
    }

    const session = await this.getConsultationSessionByIdUseCase.execute({
      consultationSessionId: prescription.getConsultationSessionId(),
    });
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${prescription.getConsultationSessionId()}" not found.`);
    }
    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
    if (!appointment) {
      throw new NotFoundError(`Appointment "${session.getAppointmentId()}" not found.`);
    }

    const [doctorProfile, patientProfile] = await Promise.all([
      this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: prescription.getAuthoringDoctorId() }),
      this.getPatientProfileByIdUseCase.execute({ patientProfileId: appointment.getPatientId() }),
    ]);
    if (!doctorProfile || !patientProfile) {
      throw new NotFoundError('The doctor or patient behind this prescription could no longer be resolved.');
    }

    const [doctorAccount, patientAccount] = await Promise.all([
      this.getAccountByIdUseCase.execute({ accountId: doctorProfile.getAccountId() }),
      this.getAccountByIdUseCase.execute({ accountId: patientProfile.getAccountId() }),
    ]);

    return this.pdfGenerator.generate({
      prescriptionId: prescription.getId(),
      doctorName: doctorAccount?.getUserProfile().getDisplayName().toString() ?? 'Unknown doctor',
      doctorLicenseNumber: doctorProfile.getLicenseNumber(),
      patientName: patientAccount?.getUserProfile().getDisplayName().toString() ?? 'Unknown patient',
      signedAt,
      lineItems: prescription.getLineItems().map((item) => ({
        drugName: item.getDrugName() ?? item.getDrugCatalogId(),
        dosage: item.getDosage(),
        frequency: item.getFrequency(),
        durationDays: item.getDurationDays(),
        instructions: item.getInstructions(),
      })),
      verificationCode,
      verificationUrl: query.verificationUrl,
    });
  }
}
