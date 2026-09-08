import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SubmitConsultationFeedbackRequestDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  // Multi-dimensional reviews (docs/01-prd.md L99-100 §2.11) -- each
  // dimension is optional so an older client (or a patient who skips them)
  // still submits a valid review carrying only the overall rating.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  punctualityRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  thoroughnessRating?: number;
}
