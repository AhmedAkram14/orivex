import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

import { ReviewModerationStatus } from '../../domain/enums/review-moderation-status.enum.js';

export class ModerateConsultationFeedbackRequestDto {
  // Deliberately excludes ReviewModerationStatus.Flagged -- an admin
  // decides Visible (restore) or Hidden (confirm), never sets a review back
  // to merely "flagged" themselves; that state only exists as the doctor's
  // own pending-review signal.
  @IsIn([ReviewModerationStatus.Visible, ReviewModerationStatus.Hidden])
  status!: ReviewModerationStatus.Visible | ReviewModerationStatus.Hidden;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
