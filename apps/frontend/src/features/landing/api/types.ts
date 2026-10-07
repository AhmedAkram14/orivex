/** Matches PublicSpecialtyResponseDto exactly. */
export interface PublicSpecialty {
  id: string;
  name: string;
  /** The Arabic name -- null until an admin has translated this specialty. */
  nameAr: string | null;
  doctorCount: number;
}

export type ProfessionalRank = 'resident' | 'registrar' | 'specialist' | 'consultant' | 'professor';
export type PublicDoctorSort = 'top_rated' | 'lowest_fee' | 'most_experienced' | 'most_booked';

/** Matches ListPublicDoctorsQueryDto exactly -- every field optional. */
export interface PublicDoctorQuery {
  specialtyId?: string;
  /** Doctor-name search. */
  q?: string;
  ranks?: ProfessionalRank[];
  practice?: 'hospital' | 'independent';
  minFeeAmount?: number;
  maxFeeAmount?: number;
  minYearsOfExperience?: number;
  minRating?: number;
  availability?: 'today' | 'week';
  /** Omitted: newest first, re-sorted by rating within the page (the homepage's ordering). */
  sort?: PublicDoctorSort;
  page?: number;
  limit?: number;
}

/** Matches PublicDoctorResponseDto exactly. */
export interface PublicDoctor {
  doctorProfileId: string;
  fullName: string;
  professionalRank?: ProfessionalRank;
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

/** Matches PublicPatientResponseDto exactly -- deliberately minimal, only what's safe to show a stranger (no health/contact data). */
export interface PublicPatient {
  patientProfileId: string;
  fullName: string;
  avatarUrl?: string;
}

/** Matches PublicDoctorListResponseDto exactly. */
export interface PublicDoctorListResult {
  doctors: PublicDoctor[];
  total: number;
  page: number;
  limit: number;
}

/** Matches PublicPlatformFeesResponseDto exactly. */
export interface PublicPlatformFees {
  /** 0-1, e.g. 0.15 = 15% of each paid consultation fee. */
  commissionRate: number;
}
