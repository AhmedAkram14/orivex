/** Matches PublicSpecialtyResponseDto exactly. */
export interface PublicSpecialty {
  id: string;
  name: string;
  doctorCount: number;
}

/** Matches PublicDoctorResponseDto exactly. */
export interface PublicDoctor {
  doctorProfileId: string;
  fullName: string;
  professionalRank?: 'resident' | 'registrar' | 'specialist' | 'consultant' | 'professor';
  specialtyName: string;
  hospitalId?: string;
  consultationFeeAmount?: number;
  averageRating: number | null;
  reviewCount: number;
}

/** Matches PublicDoctorListResponseDto exactly. */
export interface PublicDoctorListResult {
  doctors: PublicDoctor[];
  total: number;
  page: number;
  limit: number;
}
