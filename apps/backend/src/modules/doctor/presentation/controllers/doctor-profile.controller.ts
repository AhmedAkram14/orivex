import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { GetDoctorProfileByIdUseCase } from '../../application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { RegisterDoctorProfileCommand } from '../../application/use-cases/register-doctor-profile/register-doctor-profile.command.js';
import { RegisterDoctorProfileUseCase } from '../../application/use-cases/register-doctor-profile/register-doctor-profile.use-case.js';
import { UpdateDoctorProfileCommand } from '../../application/use-cases/update-doctor-profile/update-doctor-profile.command.js';
import { UpdateDoctorProfileUseCase } from '../../application/use-cases/update-doctor-profile/update-doctor-profile.use-case.js';
import { DoctorProfileResponseDto } from '../dto/doctor-profile-response.dto.js';
import { RegisterDoctorProfileRequestDto } from '../dto/register-doctor-profile-request.dto.js';
import { UpdateDoctorProfileRequestDto } from '../dto/update-doctor-profile-request.dto.js';
import { mapDoctorError } from '../mappers/doctor-exception.mapper.js';

// Own, additive resource — not the documented GET /doctors (search,
// composites ReferenceData/Trust/Availability/Reviews, none of which exist
// yet) or GET /doctors/{id}/portfolio (same composition problem). This is
// DoctorModule's own profile management surface; the composed discovery
// endpoints are future work once their dependency modules exist.
@Controller('doctors')
export class DoctorProfileController {
  constructor(
    private readonly registerDoctorProfileUseCase: RegisterDoctorProfileUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly updateDoctorProfileUseCase: UpdateDoctorProfileUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: RegisterDoctorProfileRequestDto,
  ): Promise<ResponseEnvelope<DoctorProfileResponseDto>> {
    try {
      const profile = await this.registerDoctorProfileUseCase.execute(
        new RegisterDoctorProfileCommand({
          accountId: body.accountId,
          licenseNumber: body.licenseNumber,
          specialty: body.specialty,
          biography: body.biography,
          yearsOfExperience: body.yearsOfExperience,
          languages: body.languages,
          consultationFeeAmount: body.consultationFeeAmount,
          publications: body.publications,
          awards: body.awards,
        }),
      );
      return envelope(DoctorProfileResponseDto.fromDomain(profile));
    } catch (error) {
      throw mapDoctorError(error);
    }
  }

  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<DoctorProfileResponseDto>> {
    try {
      const profile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: id });
      if (!profile) {
        throw new NotFoundError(`Doctor profile "${id}" not found.`);
      }
      return envelope(DoctorProfileResponseDto.fromDomain(profile));
    } catch (error) {
      throw mapDoctorError(error);
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDoctorProfileRequestDto,
  ): Promise<ResponseEnvelope<DoctorProfileResponseDto>> {
    try {
      const profile = await this.updateDoctorProfileUseCase.execute(
        new UpdateDoctorProfileCommand({
          doctorProfileId: id,
          specialty: body.specialty,
          biography: body.biography,
          yearsOfExperience: body.yearsOfExperience,
          languages: body.languages,
          consultationFeeAmount: body.consultationFeeAmount,
          publications: body.publications,
          awards: body.awards,
        }),
      );
      return envelope(DoctorProfileResponseDto.fromDomain(profile));
    } catch (error) {
      throw mapDoctorError(error);
    }
  }
}
