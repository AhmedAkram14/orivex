import { Controller, Get } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { ListPublicSpecialtiesUseCase } from '../../application/use-cases/list-public-specialties/list-public-specialties.use-case.js';
import { PublicSpecialtyResponseDto } from '../dto/public-specialty-response.dto.js';

// Public Landing Page (2026-07-29): genuinely public, no guard -- same
// precedent as GET /doctors/:id/reviews (DoctorReviewsController). Backs the
// landing page's "Browse Specialties" section and its search-box specialty
// picker; never exposes anything more sensitive than an active specialty
// name and how many verified doctors practice it.
@Controller('public/specialties')
export class PublicSpecialtiesController {
  constructor(private readonly listPublicSpecialtiesUseCase: ListPublicSpecialtiesUseCase) {}

  @Get()
  async list(): Promise<ResponseEnvelope<PublicSpecialtyResponseDto[]>> {
    const specialties = await this.listPublicSpecialtiesUseCase.execute();
    return envelope(specialties.map((specialty) => PublicSpecialtyResponseDto.fromDomain(specialty)));
  }
}
