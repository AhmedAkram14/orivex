import type { PublicDoctorQuery } from '@/features/landing/api/types';

export const LANDING_PATHS = {
  specialties: '/public/specialties',
  doctors: (params: PublicDoctorQuery = {}) => {
    const query = new URLSearchParams();
    if (params.specialtyId) query.set('specialtyId', params.specialtyId);
    if (params.q) query.set('q', params.q);
    if (params.ranks?.length) query.set('ranks', params.ranks.join(','));
    if (params.practice) query.set('practice', params.practice);
    if (params.minFeeAmount !== undefined) query.set('minFeeAmount', String(params.minFeeAmount));
    if (params.maxFeeAmount !== undefined) query.set('maxFeeAmount', String(params.maxFeeAmount));
    if (params.minYearsOfExperience !== undefined) query.set('minYearsOfExperience', String(params.minYearsOfExperience));
    if (params.minRating !== undefined) query.set('minRating', String(params.minRating));
    if (params.availability) query.set('availability', params.availability);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const search = query.toString();
    return search ? `/public/doctors?${search}` : '/public/doctors';
  },
  patient: (patientProfileId: string) => `/public/patients/${patientProfileId}`,
  platformFees: '/public/platform-fees',
} as const;
