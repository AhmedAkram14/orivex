// Mirrors the real, finalized backend contract exactly (ORIVEX Roadmap
// Phase 2 -- Real Global Search): `GET /search`. Per-role result-type
// availability (Patient -> doctor+appointment, Doctor -> patient+appointment,
// SuperAdmin -> doctor+patient, other roles -> doctor-only) is enforced
// entirely server-side -- this type doesn't encode that restriction, it just
// describes whatever shape comes back.
export type SearchResultType = 'doctor' | 'patient' | 'appointment';

export interface SearchResultDto {
  type: SearchResultType;
  /** doctorProfileId / patientProfileId / appointmentId, depending on `type`. */
  id: string;
  /** Display name (doctor/patient) or the counterpart's name (appointment). */
  title: string;
  /**
   * Specialty name (doctor) / "Patient" (patient) / "STATUS · YYYY-MM-DD"
   * (appointment -- the raw enum status + ISO date, not yet localized by the
   * backend). Render as plain secondary text; never re-parse or reformat it.
   */
  subtitle: string;
}

export interface SearchResponseDto {
  results: SearchResultDto[];
  total: number;
}

export interface GlobalSearchParams {
  q: string;
  type?: SearchResultType;
  /** 1-10, default 5 (server-enforced). */
  limit?: number;
}
