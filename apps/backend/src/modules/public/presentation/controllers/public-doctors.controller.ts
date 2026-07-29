import { Controller, Get, Query } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { ListPublicDoctorsQuery } from '../../application/use-cases/list-public-doctors/list-public-doctors.query.js';
import { ListPublicDoctorsUseCase } from '../../application/use-cases/list-public-doctors/list-public-doctors.use-case.js';
import { ListPublicDoctorsQueryDto } from '../dto/list-public-doctors-query.dto.js';
import { PublicDoctorListResponseDto } from '../dto/public-doctor-response.dto.js';

// Public Landing Page (2026-07-29): genuinely public, no guard -- same
// precedent as GET /doctors/:id/reviews (DoctorReviewsController). Backs the
// landing page's "Popular Doctors" section and the search box's
// specialty-filtered results preview. Deliberately narrow response shape
// (see PublicDoctorResponseDto) -- no email, license number, bio, or
// documents, unlike the authenticated GET /doctors/:id.
@Controller('public/doctors')
export class PublicDoctorsController {
  constructor(private readonly listPublicDoctorsUseCase: ListPublicDoctorsUseCase) {}

  @Get()
  async list(@Query() query: ListPublicDoctorsQueryDto): Promise<ResponseEnvelope<PublicDoctorListResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.listPublicDoctorsUseCase.execute(
      new ListPublicDoctorsQuery({ page, limit, specialtyId: query.specialtyId }),
    );
    return envelope(PublicDoctorListResponseDto.fromResult(result, page, limit));
  }
}
