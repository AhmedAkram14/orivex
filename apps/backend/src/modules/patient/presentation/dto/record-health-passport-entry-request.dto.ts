import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { HealthPassportEntryCategory } from '../../domain/enums/health-passport-entry-category.enum.js';

export class RecordHealthPassportEntryRequestDto {
  @IsEnum(HealthPassportEntryCategory)
  category!: HealthPassportEntryCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  detail?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
