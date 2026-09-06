import { AppointmentResponseDto } from '../../../consultation/presentation/dto/appointment-response.dto.js';
import { ConsultationFeedbackResponseDto } from '../../../consultation/presentation/dto/consultation-feedback-response.dto.js';
import { ConsultationSessionResponseDto } from '../../../consultation/presentation/dto/consultation-session-response.dto.js';
import { FollowUpRecommendationResponseDto } from '../../../consultation/presentation/dto/follow-up-recommendation-response.dto.js';
import type { ConsultationSummary } from '../../application/use-cases/get-consultation-summary/get-consultation-summary.use-case.js';

import { ClinicalNoteResponseDto } from './clinical-note-response.dto.js';
import { HealthGraphNodeResponseDto } from './health-graph-node-response.dto.js';
import { HealthJourneyResponseDto } from './health-journey-response.dto.js';
import { VitalReadingResponseDto } from './health-vital-summary-response.dto.js';
import { PrescriptionResponseDto } from './prescription-response.dto.js';

// Consultation lifecycle completion follow-up (2026-07-26): the single
// composed shape backing both the doctor's wrap-up view and the patient's
// post-consultation summary (§7/§12 of the fix's own scope) -- both callers
// get the same shape, since clinical notes aren't treated as doctor-private
// in this system's existing authorization model (see the use-case's own
// comment).
export class ConsultationSummaryResponseDto {
  session!: ConsultationSessionResponseDto;
  appointment!: AppointmentResponseDto;
  clinicalNotes!: ClinicalNoteResponseDto[];
  prescriptions!: PrescriptionResponseDto[];
  diagnoses!: HealthGraphNodeResponseDto[];
  vitalReadings!: VitalReadingResponseDto[];
  followUpRecommendation!: FollowUpRecommendationResponseDto | null;
  feedback!: ConsultationFeedbackResponseDto | null;
  journeys!: HealthJourneyResponseDto[];

  static fromResult(result: ConsultationSummary): ConsultationSummaryResponseDto {
    const dto = new ConsultationSummaryResponseDto();
    dto.session = ConsultationSessionResponseDto.fromDomain(result.session);
    dto.appointment = AppointmentResponseDto.fromDomain(result.appointment);
    dto.clinicalNotes = result.clinicalNotes.map((note) => ClinicalNoteResponseDto.fromDomain(note));
    dto.prescriptions = result.prescriptions.map((prescription) => PrescriptionResponseDto.fromDomain(prescription));
    dto.diagnoses = result.diagnoses.map((node) => HealthGraphNodeResponseDto.fromDomain(node));
    dto.vitalReadings = result.vitalReadings.map((reading) => VitalReadingResponseDto.fromDomain(reading));
    dto.followUpRecommendation = result.followUpRecommendation
      ? FollowUpRecommendationResponseDto.fromDomain(result.followUpRecommendation)
      : null;
    dto.feedback = result.feedback ? ConsultationFeedbackResponseDto.fromDomain(result.feedback) : null;
    dto.journeys = result.journeys.map(({ journey, rootNode }) => HealthJourneyResponseDto.fromDomain(journey, rootNode));
    return dto;
  }
}
