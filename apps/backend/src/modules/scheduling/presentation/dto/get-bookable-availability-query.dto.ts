import { IsISO8601 } from 'class-validator';

// "YYYY-MM-DD" or a full ISO instant both satisfy @IsISO8601 -- the
// use-case only ever reads calendar-day boundaries out of these (see
// GetBookableAvailabilityUseCase), so either shape is safe to accept.
export class GetBookableAvailabilityQueryDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}
