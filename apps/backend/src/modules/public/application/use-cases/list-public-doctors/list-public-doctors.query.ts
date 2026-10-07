import type { ProfessionalRank } from '../../../../doctor/domain/enums/professional-rank.enum.js';

export type PublicDoctorSort = 'top_rated' | 'lowest_fee' | 'most_experienced' | 'most_booked';
export type PublicDoctorAvailability = 'today' | 'week';

export interface ListPublicDoctorsQueryProps {
  page: number;
  limit: number;
  specialtyId?: string;
  nameQuery?: string;
  ranks?: ProfessionalRank[];
  practice?: 'hospital' | 'independent';
  minFeeAmount?: number;
  maxFeeAmount?: number;
  minYearsOfExperience?: number;
  minRating?: number;
  availability?: PublicDoctorAvailability;
  /** Omitted: the original landing-page ordering (newest first, then re-sorted by rating within the page). */
  sort?: PublicDoctorSort;
}

// Queries are application messages, not structural types — immutable by
// construction, matching ListDoctorDirectoryQuery's own established shape.
export class ListPublicDoctorsQuery {
  readonly page: number;
  readonly limit: number;
  readonly specialtyId?: string;
  readonly nameQuery?: string;
  readonly ranks?: ProfessionalRank[];
  readonly practice?: 'hospital' | 'independent';
  readonly minFeeAmount?: number;
  readonly maxFeeAmount?: number;
  readonly minYearsOfExperience?: number;
  readonly minRating?: number;
  readonly availability?: PublicDoctorAvailability;
  readonly sort?: PublicDoctorSort;

  constructor(props: ListPublicDoctorsQueryProps) {
    this.page = props.page;
    this.limit = props.limit;
    this.specialtyId = props.specialtyId;
    this.nameQuery = props.nameQuery;
    this.ranks = props.ranks;
    this.practice = props.practice;
    this.minFeeAmount = props.minFeeAmount;
    this.maxFeeAmount = props.maxFeeAmount;
    this.minYearsOfExperience = props.minYearsOfExperience;
    this.minRating = props.minRating;
    this.availability = props.availability;
    this.sort = props.sort;
  }
}
