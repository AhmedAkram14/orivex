'use client';

import { useQuery } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { doctorReviewsKeys } from '@/features/consultation/hooks/query-keys';

/**
 * §10/§11 of the consultation-completion follow-up: the real source of a
 * doctor's rating on their profile/directory card -- reviews, not a stored
 * editable field. Backed by `GET /doctors/:id/reviews`, which lives in
 * ConsultationModule rather than alongside the rest of the doctor profile
 * endpoints (see DoctorReviewsController's own comment: DoctorModule cannot
 * import ConsultationModule without a real circular dependency) -- the
 * frontend composes this with the doctor profile/directory data itself.
 */
export function useDoctorReviews(doctorProfileId: string | undefined) {
  return useQuery({
    queryKey: doctorReviewsKeys.detail(doctorProfileId ?? ''),
    queryFn: () => consultationApi.getDoctorReviews(doctorProfileId!),
    enabled: Boolean(doctorProfileId),
  });
}
