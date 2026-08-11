import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

// PATCH /scheduling/upcoming-slots/:id/pricing -- the per-slot override.
// Only meaningful while the slot is still Open (enforced domain-side by
// AvailabilityWindow.updatePricing()).
export class UpdateAvailabilityWindowPricingRequestDto {
  @IsIn(['free', 'paid'])
  pricingType!: 'free' | 'paid';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  feeAmount?: number;

  @IsOptional()
  @IsString()
  feeCurrency?: string;
}
