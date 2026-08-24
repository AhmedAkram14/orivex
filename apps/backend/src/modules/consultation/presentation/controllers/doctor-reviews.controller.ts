import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { PaginationQueryDto } from '../../../../shared/http/pagination-query.dto.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { GetDoctorRatingAggregateUseCase } from '../../application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregate.use-case.js';
import { ListConsultationFeedbackForDoctorUseCase } from '../../application/use-cases/list-consultation-feedback-for-doctor/list-consultation-feedback-for-doctor.use-case.js';
import { DoctorReviewsResponseDto } from '../dto/doctor-reviews-response.dto.js';
import type { ReviewerInfo } from '../dto/consultation-feedback-response.dto.js';

// Consultation lifecycle completion follow-up (2026-07-26): public reviews +
// rating aggregate for a doctor (§10/§11 of the fix's own scope). Lives
// here, in ConsultationModule, rather than alongside DoctorProfileController
// in DoctorModule -- ConsultationModule already legitimately imports
// DoctorModule (to resolve doctor profiles for booking), so it can safely
// call GetDoctorProfileByIdUseCase to 404 on an unknown doctor. The reverse
// (DoctorModule importing ConsultationModule) was attempted and confirmed,
// via an actual boot attempt, to create a real ESM circular-module-
// reference error at Nest bootstrap -- not just a DI-graph concern. Second,
// more permissive route onto the same underlying doctor id, same precedent
// as ReferenceDirectoryController alongside AdminReferenceController.
// Intentionally public, same reasoning as GET /doctors/:id itself.
@Controller('doctors')
export class DoctorReviewsController {
  constructor(
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly listConsultationFeedbackForDoctorUseCase: ListConsultationFeedbackForDoctorUseCase,
    private readonly getDoctorRatingAggregateUseCase: GetDoctorRatingAggregateUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
  ) {}

  @Get(':id/reviews')
  async getReviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<ResponseEnvelope<DoctorReviewsResponseDto>> {
    const doctor = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: id });
    if (!doctor) {
      throw new NotFoundError(`Doctor profile "${id}" not found.`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [result, ratingAggregate] = await Promise.all([
      this.listConsultationFeedbackForDoctorUseCase.execute({ doctorId: id, page, limit }),
      this.getDoctorRatingAggregateUseCase.execute({ doctorId: id }),
    ]);

    // Batched, not one lookup per review: reviews on the same page rarely
    // share a patient, but a shared reviewer (or a doctor with 20+ reviews
    // on one page) would otherwise mean 2N sequential lookups.
    const uniquePatientIds = [...new Set(result.feedback.map((feedback) => feedback.getPatientId()))];
    const reviewerEntries = await Promise.all(
      uniquePatientIds.map(async (patientProfileId): Promise<[string, ReviewerInfo] | null> => {
        const profile = await this.getPatientProfileByIdUseCase.execute({ patientProfileId });
        if (!profile) return null;
        const account = await this.getAccountByIdUseCase.execute({ accountId: profile.getAccountId() });
        if (!account) return null;
        return [
          patientProfileId,
          {
            patientProfileId,
            patientName: account.getUserProfile().getDisplayName().toString(),
            patientAvatarUrl: account.getUserProfile().getAvatarUrl(),
          },
        ];
      }),
    );
    const reviewersByPatientId = new Map(reviewerEntries.filter((entry): entry is [string, ReviewerInfo] => entry !== null));

    return envelope(DoctorReviewsResponseDto.fromResult(result, page, limit, ratingAggregate, reviewersByPatientId));
  }
}
