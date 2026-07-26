import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { GetBookableAvailabilityQuery } from '../../application/use-cases/get-bookable-availability/get-bookable-availability.query.js';
import { GetBookableAvailabilityUseCase } from '../../application/use-cases/get-bookable-availability/get-bookable-availability.use-case.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { AvailabilityWindowResponseDto } from '../dto/availability-window-response.dto.js';
import { GetBookableAvailabilityQueryDto } from '../dto/get-bookable-availability-query.dto.js';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25): the patient-
 * facing "what can I actually book with this doctor" read. Lives in
 * SchedulingModule (not DoctorModule) despite the `/doctors` path prefix --
 * same "shared path prefix, different owning module/file" precedent as
 * `AppointmentController`/`DoctorAppointmentsController` -- so the
 * dependency direction stays the existing one-way SchedulingModule ->
 * DoctorModule, never the reverse. Any authenticated account may call this
 * (a patient deciding who to book, mirrors `GET /doctors/:id`'s own
 * no-role-restriction stance) -- it never exposes another patient's data,
 * only a doctor's own bookable schedule.
 */
@Controller('doctors')
export class DoctorAvailabilityController {
  constructor(private readonly getBookableAvailabilityUseCase: GetBookableAvailabilityUseCase) {}

  @Get(':doctorId/availability-windows')
  @UseGuards(JwtAuthGuard)
  async getAvailabilityWindows(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Query() query: GetBookableAvailabilityQueryDto,
  ): Promise<ResponseEnvelope<AvailabilityWindowResponseDto[]>> {
    const windows = await this.getBookableAvailabilityUseCase.execute(
      new GetBookableAvailabilityQuery({ doctorId, from: new Date(query.from), to: new Date(query.to) }),
    );
    return envelope(windows.map((window) => AvailabilityWindowResponseDto.fromDomain(window)));
  }
}
