import { Controller, Get } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { GetPlatformFeeScheduleUseCase } from '../../../payment/application/use-cases/get-platform-fee-schedule/get-platform-fee-schedule.use-case.js';
import { PublicPlatformFeesResponseDto } from '../dto/public-platform-fees-response.dto.js';

// Public "For Doctors" page (2026-10-06): genuinely public, no guard, same
// precedent as the other /public/* controllers. Exposes only the platform
// commission rate -- already disclosed to every doctor on their earnings
// page -- so a prospective doctor sees the real number before applying.
@Controller('public/platform-fees')
export class PublicPlatformFeesController {
  constructor(private readonly getPlatformFeeScheduleUseCase: GetPlatformFeeScheduleUseCase) {}

  @Get()
  get(): ResponseEnvelope<PublicPlatformFeesResponseDto> {
    return envelope(PublicPlatformFeesResponseDto.fromSchedule(this.getPlatformFeeScheduleUseCase.execute()));
  }
}
