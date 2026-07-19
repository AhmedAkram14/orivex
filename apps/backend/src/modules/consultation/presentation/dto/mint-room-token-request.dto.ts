import { IsOptional, IsString, MaxLength } from 'class-validator';

// ORIVEX Roadmap 2.0 Stage 2 -- Telemedicine. `displayName` is cosmetic
// only (the label LiveKit shows other participants) -- never used for
// authorization, which is derived entirely from the caller's own JWT
// claims/ownership check, never from this request body. Optional: the
// controller falls back to a role-based label ("Doctor"/"Patient") when
// omitted or blank.
export class MintRoomTokenRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}
