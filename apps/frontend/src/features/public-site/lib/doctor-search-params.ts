import type { ProfessionalRank, PublicDoctorQuery, PublicDoctorSort } from '@/features/landing/api/types';

/**
 * The Find-a-Doctor filters as they live in the page URL, so a filtered
 * result list can be shared or bookmarked. Short, human-readable keys
 * (`?specialty=cardiology&sort=lowest_fee&minFee=200`); the specialty is its
 * slug, resolved to an id by the page. Anything malformed is dropped rather
 * than sent to the API.
 */
export interface DoctorSearchState {
  specialty?: string;
  q?: string;
  availability?: 'today' | 'week';
  minFee?: number;
  maxFee?: number;
  minYears?: number;
  ranks?: ProfessionalRank[];
  minRating?: number;
  practice?: 'hospital' | 'independent';
  sort?: PublicDoctorSort;
  page?: number;
}

export const DOCTOR_SORTS: readonly PublicDoctorSort[] = ['top_rated', 'lowest_fee', 'most_experienced', 'most_booked'];
/** Ranks a patient can filter by -- residents don't take independent consultations, so they aren't offered. */
export const FILTERABLE_RANKS: readonly ProfessionalRank[] = ['registrar', 'specialist', 'consultant', 'professor'];
export const MIN_RATING_OPTIONS = [4.5, 4, 3.5] as const;
export const MIN_YEARS_OPTIONS = [5, 10, 15, 20] as const;
/** UI bounds of the fee slider (EGP), not data: the filter itself is sent as-is to the API. */
export const FEE_SLIDER = { min: 0, max: 3000, step: 50 } as const;
export const DOCTORS_PAGE_SIZE = 12;

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

function read(params: RawParams, key: string): string | undefined {
  const value = params instanceof URLSearchParams ? params.get(key) : params[key];
  const single = Array.isArray(value) ? value[0] : value;
  return single?.trim() || undefined;
}

function readInt(params: RawParams, key: string, min: number, max: number): number | undefined {
  const raw = read(params, key);
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return value >= min && value <= max ? value : undefined;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export function parseDoctorSearch(params: RawParams): DoctorSearchState {
  const minRatingRaw = Number(read(params, 'minRating'));
  const ranks = read(params, 'ranks')
    ?.split(',')
    .map((rank) => oneOf(rank, FILTERABLE_RANKS))
    .filter((rank): rank is ProfessionalRank => rank !== undefined);

  return {
    specialty: read(params, 'specialty')?.toLowerCase().replace(/[^a-z0-9-]/g, '') || undefined,
    q: read(params, 'q')?.slice(0, 100),
    availability: oneOf(read(params, 'availability'), ['today', 'week'] as const),
    minFee: readInt(params, 'minFee', 0, 1_000_000),
    maxFee: readInt(params, 'maxFee', 0, 1_000_000),
    minYears: readInt(params, 'minYears', 0, 70),
    ranks: ranks?.length ? ranks : undefined,
    minRating: (MIN_RATING_OPTIONS as readonly number[]).includes(minRatingRaw) ? minRatingRaw : undefined,
    practice: oneOf(read(params, 'practice'), ['hospital', 'independent'] as const),
    sort: oneOf(read(params, 'sort'), DOCTOR_SORTS),
    page: readInt(params, 'page', 1, 10_000),
  };
}

/** Back to a query string, omitting empty values (and page 1) so URLs stay short. */
export function serializeDoctorSearch(state: DoctorSearchState): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  };
  set('specialty', state.specialty);
  set('q', state.q);
  set('availability', state.availability);
  set('minFee', state.minFee);
  set('maxFee', state.maxFee);
  set('minYears', state.minYears);
  set('ranks', state.ranks?.join(','));
  set('minRating', state.minRating);
  set('practice', state.practice);
  set('sort', state.sort);
  if (state.page && state.page > 1) set('page', state.page);
  return params.toString();
}

/** How many filters (not search text, sort or page) are active -- the badge on the mobile "Filters" button. */
export function countActiveFilters(state: DoctorSearchState, { includeSpecialty }: { includeSpecialty: boolean }): number {
  return [
    includeSpecialty && state.specialty,
    state.availability,
    state.minFee !== undefined || state.maxFee !== undefined,
    state.minYears,
    state.ranks?.length,
    state.minRating,
    state.practice,
  ].filter(Boolean).length;
}

export function toPublicDoctorQuery(state: DoctorSearchState, specialtyId: string | undefined): PublicDoctorQuery {
  return {
    specialtyId,
    q: state.q,
    availability: state.availability,
    minFeeAmount: state.minFee,
    maxFeeAmount: state.maxFee,
    minYearsOfExperience: state.minYears,
    ranks: state.ranks,
    minRating: state.minRating,
    practice: state.practice,
    // The public pages always show an explicit, global ordering -- top rated by default.
    sort: state.sort ?? 'top_rated',
    page: state.page ?? 1,
    limit: DOCTORS_PAGE_SIZE,
  };
}
