export const LANDING_PATHS = {
  specialties: '/public/specialties',
  doctors: (params: { specialtyId?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.specialtyId) query.set('specialtyId', params.specialtyId);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const search = query.toString();
    return search ? `/public/doctors?${search}` : '/public/doctors';
  },
  patient: (patientProfileId: string) => `/public/patients/${patientProfileId}`,
} as const;
