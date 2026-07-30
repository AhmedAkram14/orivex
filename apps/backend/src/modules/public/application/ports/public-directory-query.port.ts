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
  hospitalId?: string;
  hospitalName?: string;
  yearsOfExperience?: number;
  consultationFeeAmount?: number;
}

export interface PublicDoctorFilter {
  specialtyId?: string;
  limit: number;
  offset: number;
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
