import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RecommendFollowUpRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason!: string;

  @IsOptional()
  @IsISO8601()
  recommendedDate?: string;
}
