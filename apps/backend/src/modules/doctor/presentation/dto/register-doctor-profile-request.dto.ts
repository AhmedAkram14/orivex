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

// accountId is intentionally not a client-supplied field -- the controller
// derives it from the authenticated caller's JWT (CurrentUser), so a doctor
// can only ever register a profile for their own account.
export class RegisterDoctorProfileRequestDto {
  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;

  @IsString()
  @IsNotEmpty()
  specialty!: string;

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

  // Onboarding Redesign (2026-07-21 proposal, Stage O.3): additive alongside
  // the still-required free-text `specialty` above during the transition
  // (§10) -- existence of specialtyId/departmentId is enforced by their
  // database FKs, not a second lookup here.
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
