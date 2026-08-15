export interface PatientSearchRow {
  patientProfileId: string;
  displayName: string;
}

export interface PatientSearchResult {
  entries: PatientSearchRow[];
  total: number;
}

// Never selects PatientProfile.bloodType/allergies/chronicDiseases/
// insuranceProviderId anywhere in the implementation of this port -- only
// `id` and the joined Account.displayName ever reach this row shape.
export interface SearchPatientsPort {
  searchForDoctor(params: { doctorProfileId: string; query: string; limit: number }): Promise<PatientSearchResult>;
  searchAdmin(params: { query: string; limit: number }): Promise<PatientSearchResult>;
}
