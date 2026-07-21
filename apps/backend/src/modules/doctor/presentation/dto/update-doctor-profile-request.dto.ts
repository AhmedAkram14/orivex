import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

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
  @IsNotEmpty()
  specialty?: string;

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
}
