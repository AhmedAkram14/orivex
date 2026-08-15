export interface DoctorSearchRow {
  doctorProfileId: string;
  displayName: string;
  specialtyName: string | null;
}

export interface DoctorSearchResult {
  entries: DoctorSearchRow[];
  total: number;
}

export interface DoctorSearchParams {
  query: string;
  limit: number;
}

// Two distinct queries, not one parameterized by a "scope" flag -- the
// match fields genuinely differ (see GlobalSearchUseCase's role table):
// searchPublic OR-matches name/specialty/hospital (the existing GET /doctors
// public-directory precedent, PrismaDoctorDirectoryQueryService), while
// searchAdmin matches Account.displayName only (mirrors GET /admin/accounts'
// unrestricted, name-only lookup).
export interface SearchDoctorsPort {
  searchPublic(params: DoctorSearchParams): Promise<DoctorSearchResult>;
  searchAdmin(params: DoctorSearchParams): Promise<DoctorSearchResult>;
}
