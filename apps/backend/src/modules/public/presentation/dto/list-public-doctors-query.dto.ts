import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

import { ProfessionalRank } from '../../../doctor/domain/enums/professional-rank.enum.js';
import { PaginationQueryDto } from '../../../../shared/http/pagination-query.dto.js';
import type { PublicDoctorAvailability, PublicDoctorSort } from '../../application/use-cases/list-public-doctors/list-public-doctors.query.js';

export const PUBLIC_DOCTOR_SORTS: readonly PublicDoctorSort[] = ['top_rated', 'lowest_fee', 'most_experienced', 'most_booked'];
export const PUBLIC_DOCTOR_AVAILABILITIES: readonly PublicDoctorAvailability[] = ['today', 'week'];

// Public Find-a-Doctor page (2026-10-06): every parameter is optional and
// additive -- a caller sending only `specialtyId`/`page`/`limit` (the
// landing page) gets exactly the response it got before.
export class ListPublicDoctorsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4')
  specialtyId?: string;

  /** Doctor-name search (case-insensitive substring). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  /** Comma-separated ProfessionalRank values, e.g. `specialist,consultant`. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((rank) => rank.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsIn(Object.values(ProfessionalRank), { each: true })
  ranks?: ProfessionalRank[];

  @IsOptional()
  @IsIn(['hospital', 'independent'])
  practice?: 'hospital' | 'independent';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minFeeAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxFeeAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(70)
  minYearsOfExperience?: number;

  /** Average rating >= this (1-5, fractional allowed, e.g. 4.5). Doctors with no reviews never match. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  /** `today`: open today; `week`: open on at least one of the next 7 days (today included). */
  @IsOptional()
  @IsIn(PUBLIC_DOCTOR_AVAILABILITIES)
  availability?: PublicDoctorAvailability;

  @IsOptional()
  @IsIn(PUBLIC_DOCTOR_SORTS)
  sort?: PublicDoctorSort;
}
