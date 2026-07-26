import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import { ProfessionalRank } from '../../domain/enums/professional-rank.enum.js';

class PortfolioPublicationDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

class PortfolioAwardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  issuingBody?: string;
}

export class UpdateDoctorProfileRequestDto {
  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFeeAmount?: number;

  // Doctor Onboarding (Phase 4 continuation): optional hospital affiliation
  // -- existence is enforced by the database FK, not a second lookup here.
  @IsOptional()
  @IsUUID('4')
  hospitalId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioPublicationDto)
  publications?: PortfolioPublicationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioAwardDto)
  awards?: PortfolioAwardDto[];

  // Onboarding Redesign (2026-07-21 proposal, Stage O.3).
  @IsOptional()
  @IsUUID('4')
  specialtyId?: string;

  @IsOptional()
  @IsEnum(ProfessionalRank)
  professionalRank?: ProfessionalRank;

  @IsOptional()
  @IsDateString()
  licenseExpiryDate?: string;

  @IsOptional()
  @IsUUID('4')
  departmentId?: string;
}
