import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

import { DisputeStatus } from '../../../consultation/domain/enums/dispute-status.enum.js';

export class ResolveDisputeRequestDto {
  // Deliberately excludes DisputeStatus.Open -- an admin closes a dispute
  // one way or the other, never sets it back to open themselves.
  @IsIn([DisputeStatus.Resolved, DisputeStatus.Dismissed])
  status!: DisputeStatus.Resolved | DisputeStatus.Dismissed;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  resolutionNotes!: string;
}
