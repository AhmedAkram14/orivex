import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { Prescription } from '../../../domain/entities/prescription.entity.js';
import type { PrescriptionRepository } from '../../../domain/repositories/prescription.repository.js';
import { GetHealthGraphSubgraphUseCase } from '../get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';

import type { SignPrescriptionCommand } from './sign-prescription.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// clinical.module.ts only. Matches docs/12-openapi.md's signPrescription
// exactly: resolves the ConsultationSession -> Appointment (via
// ConsultationModule's own exported use cases -- module-to-module calls
// only through a published interface) to get the patient, then validates
// diagnosisNodeId is a real HealthGraphNode belonging to that patient via
// this module's own GetHealthGraphSubgraphUseCase (no cross-module query
// needed -- Prescription lives inside ClinicalModule).
//
// The documented "deterministic drug interaction/allergy check" (ADR-002)
// and "unacknowledged Warning-tier AI suggestion" block are deliberately
// not implemented -- they require ReferenceDataModule's Drug Catalog and
// AIModule, neither of which exists yet. This is a known, deferred gap,
// not a silently-skipped safety feature.
export class SignPrescriptionUseCase {
  constructor(
    private readonly prescriptionRepository: PrescriptionRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getHealthGraphSubgraphUseCase: GetHealthGraphSubgraphUseCase,
  ) {}

  async execute(command: SignPrescriptionCommand): Promise<Prescription> {
    const session = await this.getConsultationSessionByIdUseCase.execute({
      consultationSessionId: command.consultationSessionId,
    });
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${command.consultationSessionId}" not found.`);
    }

    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
    if (!appointment) {
      throw new NotFoundError(`Appointment "${session.getAppointmentId()}" not found.`);
    }

    const doctor = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: command.authoringDoctorId });
    if (!doctor) {
      throw new NotFoundError(`Doctor profile "${command.authoringDoctorId}" not found.`);
    }

    const nodes = await this.getHealthGraphSubgraphUseCase.execute({
      patientId: appointment.getPatientId(),
      rootNodeId: command.diagnosisNodeId,
    });
    if (nodes.length === 0) {
      throw new NotFoundError(`HealthGraphNode "${command.diagnosisNodeId}" not found for this patient.`);
    }

    const prescription = Prescription.sign({
      consultationSessionId: command.consultationSessionId,
      diagnosisNodeId: command.diagnosisNodeId,
      authoringDoctorId: command.authoringDoctorId,
      lineItems: command.lineItems,
    });

    await this.prescriptionRepository.save(prescription);
    await this.eventDispatcher.dispatch(prescription.releaseDomainEvents());

    return prescription;
  }
}
