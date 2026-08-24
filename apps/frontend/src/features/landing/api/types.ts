/** Matches PublicSpecialtyResponseDto exactly. */
export interface PublicSpecialty {
  id: string;
  name: string;
  /** The Arabic name -- null until an admin has translated this specialty. */
  nameAr: string | null;
  doctorCount: number;
}

/** Matches PublicDoctorResponseDto exactly. */
export interface PublicDoctor {
  doctorProfileId: string;
  fullName: string;
  professionalRank?: 'resident' | 'registrar' | 'specialist' | 'consultant' | 'professor';
  specialtyName: string;
  /** The Arabic specialty name -- null until an admin has translated it. */
  specialtyNameAr: string | null;
  hospitalId?: string;
  hospitalName?: string;
  yearsOfExperience?: number;
  consultationFeeAmount?: number;
  avatarUrl?: string;
  averageRating: number | null;
  reviewCount: number;
  writtenReviewCount: number;
  availability: 'today' | 'tomorrow' | null;
  isTopRated: boolean;
  isMostBooked: boolean;
}

/** Matches PublicDoctorListResponseDto exactly. */
export interface PublicDoctorListResult {
  doctors: PublicDoctor[];
  total: number;
  page: number;
  limit: number;
}
