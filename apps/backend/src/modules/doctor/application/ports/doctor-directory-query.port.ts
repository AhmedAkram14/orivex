// Onboarding Redesign (2026-07-21 proposal, §5/§9/§14 Stage O.1): a
// dedicated read-model port for the Patient Dashboard's Browse/Search
// Doctors screens -- deliberately NOT a new method on DoctorProfileRepository
// (the aggregate's write-side port), which would have forced every one of
// the ~20 hand-written DoctorProfileRepository test fakes across the backend
// to grow a matching stub for a single list/browse read. CQRS: this is a
// query-side concern, served by its own small port with its own single
// Prisma-backed implementation.
//
// Deliberately minimal -- hospital filtering, an exact/contains match on the
// still-free-text `specialty` column, and (since Stage O.3) an exact
// specialtyId match alongside it -- both filters are honored, not either/or,
// so already-submitted profiles with an unmatched free-text specialty stay
// searchable even after specialtyId exists. Paginated, no full-text name
// search (that's Stage 8's real search work; see
// docs/roadmaps/orivex-master-roadmap.md).
export interface DoctorDirectoryEntry {
  doctorProfileId: string;
  accountId: string;
  displayName: string;
  specialty: string;
  specialtyId?: string;
  yearsOfExperience?: number;
  consultationFeeAmount?: number;
  hospitalId?: string;
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
