import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { Appointment } from '../../../../consultation/domain/entities/appointment.entity.js';
import type { ConsultationFeedback } from '../../../../consultation/domain/entities/consultation-feedback.entity.js';
import type { ConsultationSession } from '../../../../consultation/domain/entities/consultation-session.entity.js';
import type { FollowUpRecommendation } from '../../../../consultation/domain/entities/follow-up-recommendation.entity.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationFeedbackForSessionUseCase } from '../../../../consultation/application/use-cases/get-consultation-feedback-for-session/get-consultation-feedback-for-session.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { GetFollowUpRecommendationForSessionUseCase } from '../../../../consultation/application/use-cases/get-follow-up-recommendation-for-session/get-follow-up-recommendation-for-session.use-case.js';
import type { ClinicalNote } from '../../../domain/entities/clinical-note.entity.js';
import type { HealthGraphNode } from '../../../domain/entities/health-graph-node.entity.js';
import type { HealthJourney } from '../../../domain/entities/health-journey.entity.js';
import type { Prescription } from '../../../domain/entities/prescription.entity.js';
import type { VitalReading } from '../../../domain/entities/vital-reading.entity.js';
import { HealthGraphNodeType } from '../../../domain/enums/health-graph-node-type.enum.js';
import { GetHealthGraphSubgraphUseCase } from '../get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { ListClinicalNotesForConsultationSessionUseCase } from '../list-clinical-notes-for-consultation-session/list-clinical-notes-for-consultation-session.use-case.js';
import { ListHealthJourneysUseCase } from '../list-health-journeys/list-health-journeys.use-case.js';
import { ListPrescriptionsForConsultationSessionUseCase } from '../list-prescriptions-for-consultation-session/list-prescriptions-for-consultation-session.use-case.js';
import { ListVitalReadingsForConsultationSessionUseCase } from '../list-vital-readings-for-consultation-session/list-vital-readings-for-consultation-session.use-case.js';

export interface GetConsultationSummaryQuery {
  consultationSessionId: string;
}

export interface ConsultationSummaryJourney {
  journey: HealthJourney;
  rootNode: HealthGraphNode;
}

export interface ConsultationSummary {
  session: ConsultationSession;
  appointment: Appointment;
  clinicalNotes: ClinicalNote[];
  prescriptions: Prescription[];
  diagnoses: HealthGraphNode[];
  vitalReadings: VitalReading[];
  followUpRecommendation: FollowUpRecommendation | null;
  feedback: ConsultationFeedback | null;
  // Health Journey stage-advance fix (ORIVEX Remaining Work Audit, P0 C5):
  // every one of this patient's Health Journeys (not just ones started this
  // session) -- a doctor advances a chronic patient's ongoing journey during
  // a later follow-up consultation just as often as a brand-new one at
  // diagnosis time. rootNode is resolved from allPatientNodes (already
  // fetched for `diagnoses` below), so no extra query is needed.
  journeys: ConsultationSummaryJourney[];
}

// Consultation lifecycle completion follow-up (2026-07-26): the single
// composed read that backs both the doctor's end-of-call wrap-up view and
// the patient's post-consultation summary screen -- previously this
// composition only ever happened ad hoc, per-appointment, fanned out across
// a patient's entire appointment list inside PatientDashboardController.
// This is scoped to one session instead. Lives in ClinicalModule (not
// ConsultationModule) to keep the established one-way dependency direction
// intact: ClinicalModule already depends on ConsultationModule's exported
// read use-cases (RecordClinicalNoteUseCase/SignPrescriptionUseCase do the
// same), never the reverse.
//
// Clinical notes are included for both doctor and patient callers -- this
// system's existing authorization model already exposes them to the
// patient via GET /patients/me/medical-records (PatientDashboardController),
// so there is no existing "doctor-private note" concept to preserve here.
// The controller is what enforces that the caller (doctor or patient) is
// actually a party to this consultation before calling this use case.
export class GetConsultationSummaryUseCase {
  constructor(
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly listClinicalNotesForConsultationSessionUseCase: ListClinicalNotesForConsultationSessionUseCase,
    private readonly listPrescriptionsForConsultationSessionUseCase: ListPrescriptionsForConsultationSessionUseCase,
    private readonly getHealthGraphSubgraphUseCase: GetHealthGraphSubgraphUseCase,
    private readonly getFollowUpRecommendationForSessionUseCase: GetFollowUpRecommendationForSessionUseCase,
    private readonly getConsultationFeedbackForSessionUseCase: GetConsultationFeedbackForSessionUseCase,
    private readonly listVitalReadingsForConsultationSessionUseCase: ListVitalReadingsForConsultationSessionUseCase,
    private readonly listHealthJourneysUseCase: ListHealthJourneysUseCase,
  ) {}

  async execute(query: GetConsultationSummaryQuery): Promise<ConsultationSummary> {
    const session = await this.getConsultationSessionByIdUseCase.execute({
      consultationSessionId: query.consultationSessionId,
    });
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${query.consultationSessionId}" not found.`);
    }

    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
    if (!appointment) {
      throw new NotFoundError(`Appointment "${session.getAppointmentId()}" not found.`);
    }

    const [clinicalNotes, prescriptions, allPatientNodes, followUpRecommendation, feedback, vitalReadings, allJourneys] =
      await Promise.all([
        this.listClinicalNotesForConsultationSessionUseCase.execute({
          consultationSessionId: query.consultationSessionId,
        }),
        this.listPrescriptionsForConsultationSessionUseCase.execute({
          consultationSessionId: query.consultationSessionId,
        }),
        this.getHealthGraphSubgraphUseCase.execute({ patientId: appointment.getPatientId() }),
        this.getFollowUpRecommendationForSessionUseCase.execute({
          consultationSessionId: query.consultationSessionId,
        }),
        this.getConsultationFeedbackForSessionUseCase.execute({ consultationSessionId: query.consultationSessionId }),
        this.listVitalReadingsForConsultationSessionUseCase.execute({
          consultationSessionId: query.consultationSessionId,
        }),
        this.listHealthJourneysUseCase.execute({ patientId: appointment.getPatientId() }),
      ]);

    const diagnoses = allPatientNodes.filter(
      (node) => node.getConsultationSessionId() === query.consultationSessionId
        && node.getNodeType() === HealthGraphNodeType.Condition,
    );

    const nodesById = new Map(allPatientNodes.map((node) => [node.getId(), node]));
    const journeys: ConsultationSummaryJourney[] = [];
    for (const journey of allJourneys) {
      const rootNode = nodesById.get(journey.getRootNodeId());
      if (rootNode) {
        journeys.push({ journey, rootNode });
      }
    }

    return { session, appointment, clinicalNotes, prescriptions, diagnoses, vitalReadings, followUpRecommendation, feedback, journeys };
  }
}
