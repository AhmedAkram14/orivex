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
  hospitalName?: string;
  yearsOfExperience?: number;
  consultationFeeAmount?: number;
  averageRating: number | null;
  reviewCount: number;
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
