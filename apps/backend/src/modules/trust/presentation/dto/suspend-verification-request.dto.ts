import { IsNotEmpty, IsString } from 'class-validator';

// Onboarding Redesign (2026-07-21 proposal, Stage O.2): suspend() always
// requires an explicit reason, unlike decide() where reason is optional --
// a suspension revokes previously-granted standing and must always say why.
export class SuspendVerificationRequestDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
