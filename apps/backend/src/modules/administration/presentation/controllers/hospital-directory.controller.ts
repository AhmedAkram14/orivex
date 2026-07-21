import { Controller, Get, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { ListHospitalsUseCase } from '../../application/use-cases/list-hospitals/list-hospitals.use-case.js';
import { HospitalResponseDto } from '../dto/hospital-response.dto.js';

// Doctor Onboarding (Phase 4 continuation): a read-only hospital directory
// any authenticated account (patient mid-onboarding, doctor editing their
// profile) can browse to pick a hospital affiliation -- deliberately not
// the SuperAdmin-only `/admin/hospitals` surface. Reuses
// AdministrationModule's own ListHospitalsUseCase exactly (no duplicated
// query, no parallel repository read); this is purely a second, more
// permissive route onto the same use case, mirroring the
// "own aggregate's public-directory read" precedent DoctorProfileController
// already established for `GET /doctors/:id`.
@Controller('hospitals')
@UseGuards(JwtAuthGuard)
export class HospitalDirectoryController {
  constructor(private readonly listHospitalsUseCase: ListHospitalsUseCase) {}

  @Get()
  async list(): Promise<ResponseEnvelope<HospitalResponseDto[]>> {
    const hospitals = await this.listHospitalsUseCase.execute();
    return envelope(hospitals.map((hospital) => HospitalResponseDto.fromDomain(hospital)));
  }
}
