import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { ListDepartmentsQuery } from '../../application/use-cases/list-departments/list-departments.query.js';
import { ListDepartmentsUseCase } from '../../application/use-cases/list-departments/list-departments.use-case.js';
import { ListHospitalsUseCase } from '../../application/use-cases/list-hospitals/list-hospitals.use-case.js';
import { DepartmentResponseDto } from '../dto/department-response.dto.js';
import { HospitalResponseDto } from '../dto/hospital-response.dto.js';
import { mapAdministrationError } from '../mappers/administration-exception.mapper.js';

// Doctor Onboarding (Phase 4 continuation): a read-only hospital directory
// any authenticated account (patient mid-onboarding, doctor editing their
// profile) can browse to pick a hospital affiliation -- deliberately not
// the SuperAdmin-only `/admin/hospitals` surface. Reuses
// AdministrationModule's own ListHospitalsUseCase exactly (no duplicated
// query, no parallel repository read); this is purely a second, more
// permissive route onto the same use case, mirroring the
// "own aggregate's public-directory read" precedent DoctorProfileController
// already established for `GET /doctors/:id`.
//
// Onboarding Redesign (2026-07-21 proposal, Stage O.6): `:id/departments`
// mirrors the same "second, more permissive route" pattern for
// ListDepartmentsUseCase -- the only prior department-listing route
// (`AdministrationController`'s `/admin/hospitals/:id/departments`) is
// SuperAdmin-only, and a Doctor mid-onboarding needs to browse a chosen
// hospital's departments too.
@Controller('hospitals')
@UseGuards(JwtAuthGuard)
export class HospitalDirectoryController {
  constructor(
    private readonly listHospitalsUseCase: ListHospitalsUseCase,
    private readonly listDepartmentsUseCase: ListDepartmentsUseCase,
  ) {}

  @Get()
  async list(): Promise<ResponseEnvelope<HospitalResponseDto[]>> {
    const hospitals = await this.listHospitalsUseCase.execute();
    return envelope(hospitals.map((hospital) => HospitalResponseDto.fromDomain(hospital)));
  }

  @Get(':id/departments')
  async listDepartments(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseEnvelope<DepartmentResponseDto[]>> {
    try {
      const departments = await this.listDepartmentsUseCase.execute(new ListDepartmentsQuery({ hospitalId: id }));
      return envelope(departments.map((department) => DepartmentResponseDto.fromDomain(department)));
    } catch (error) {
      throw mapAdministrationError(error);
    }
  }
}
