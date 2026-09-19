import { IsBoolean, IsOptional } from 'class-validator';

// Doctor Settings Rebuild, Phase 2: every field optional -- PATCH semantics,
// only the toggles the caller actually flips get applied
// (UpdateNotificationPreferencesUseCase's own find-or-create + partial-apply
// logic), matching PATCH /accounts/me's own partial-update convention.
export class UpdateNotificationPreferencesRequestDto {
  @IsOptional()
  @IsBoolean()
  emailAppointments?: boolean;

  @IsOptional()
  @IsBoolean()
  emailBilling?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppAppointments?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppBilling?: boolean;
}
