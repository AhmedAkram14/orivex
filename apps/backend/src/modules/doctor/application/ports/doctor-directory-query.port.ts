// Onboarding Redesign (2026-07-21 proposal, §5/§9/§14 Stage O.1): a
// dedicated read-model port for the Patient Dashboard's Browse/Search
// Doctors screens -- deliberately NOT a new method on DoctorProfileRepository
// (the aggregate's write-side port), which would have forced every one of
// the ~20 hand-written DoctorProfileRepository test fakes across the backend
// to grow a matching stub for a single list/browse read. CQRS: this is a
// query-side concern, served by its own small port with its own single
// Prisma-backed implementation.
//
// Deliberately minimal -- hospital filtering, a `specialty` free-text search
// (Onboarding Redesign, 2026-07-21 proposal, Stage O.9: matched against
// MedicalSpecialty.name via a join now that DoctorProfile no longer carries
// its own free-text copy), and an exact specialtyId match alongside it --
// both filters are honored, not either/or. Paginated, no full-text name
// search (that's Stage 8's real search work; see
// docs/roadmaps/orivex-master-roadmap.md). No specialty *name* on the entry
// itself -- same convention as hospitalId/departmentId already on
// DoctorProfile: the caller resolves the display name from the id via its
// own reference-data lookup, not a denormalized copy here.
export interface DoctorDirectoryEntry {
  doctorProfileId: string;
  accountId: string;
  displayName: string;
  specialtyId: string;
  yearsOfExperience?: number;
  consultationFeeAmount?: number;
  hospitalId?: string;
  avatarUrl?: string;
}

export interface DoctorDirectoryFilter {
  specialty?: string;
  specialtyId?: string;
  hospitalId?: string;
  limit: number;
  offset: number;
}

export interface DoctorDirectoryResult {
  entries: DoctorDirectoryEntry[];
  total: number;
}

export interface DoctorDirectoryQueryPort {
  search(filter: DoctorDirectoryFilter): Promise<DoctorDirectoryResult>;
}
