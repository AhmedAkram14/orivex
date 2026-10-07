import type { ProfessionalRank } from '../../../doctor/domain/enums/professional-rank.enum.js';

// Public Landing Page (2026-07-29): a dedicated read-model port, same
// rationale as DoctorDirectoryQueryPort's own header comment -- a query-side
// concern with its own shape (role=Doctor filter, resolved specialty name,
// professionalRank) that doesn't belong on DoctorProfileRepository or on the
// existing internal DoctorDirectoryQueryPort, which neither of these two
// public-facing reads can reuse as-is.
export interface PublicSpecialtyCount {
  specialtyId: string;
  doctorCount: number;
}

export interface PublicDoctorEntry {
  doctorProfileId: string;
  fullName: string;
  professionalRank?: ProfessionalRank;
  specialtyId: string;
  specialtyName: string;
  specialtyNameAr?: string;
  hospitalId?: string;
  hospitalName?: string;
  yearsOfExperience?: number;
  consultationFeeAmount?: number;
  avatarUrl?: string;
}

/** The orderings this port can apply in SQL -- every column lives on DoctorProfile itself. */
export type PublicDoctorSqlSort = 'newest' | 'lowest_fee' | 'most_experienced';

// Public Find-a-Doctor page (2026-10-06): every filter here is a column of
// DoctorProfile (or its Account's displayName), so it is applied in SQL.
// Rating- and booking-based filters/sorts are NOT here: those aggregates are
// owned by ConsultationModule and are applied by ListPublicDoctorsUseCase.
export interface PublicDoctorFilter {
  specialtyId?: string;
  /** Case-insensitive substring of the doctor's display name. */
  nameQuery?: string;
  ranks?: ProfessionalRank[];
  /** `hospital`: affiliated with a hospital; `independent`: no hospital. */
  practice?: 'hospital' | 'independent';
  minFeeAmount?: number;
  maxFeeAmount?: number;
  minYearsOfExperience?: number;
  /** Defaults to `newest`. */
  sort?: PublicDoctorSqlSort;
  /** Both omitted: every matching doctor, for a use case that must post-filter on another module's aggregate. */
  limit?: number;
  offset?: number;
}

export interface PublicDoctorResult {
  entries: PublicDoctorEntry[];
  total: number;
}

export interface PublicDirectoryQueryPort {
  /** Only counts DoctorProfiles whose owning Account has actually been promoted to Doctor (i.e. verification-approved) -- never a raw pending-applicant count. */
  countDoctorsBySpecialty(): Promise<PublicSpecialtyCount[]>;
  searchDoctors(filter: PublicDoctorFilter): Promise<PublicDoctorResult>;
}
