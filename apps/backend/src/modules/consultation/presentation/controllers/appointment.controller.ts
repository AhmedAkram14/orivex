import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { BookAppointmentCommand } from '../../application/use-cases/book-appointment/book-appointment.command.js';
import { BookAppointmentUseCase } from '../../application/use-cases/book-appointment/book-appointment.use-case.js';
import { RescheduleOrCancelAppointmentCommand } from '../../application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.command.js';
import { RescheduleOrCancelAppointmentUseCase } from '../../application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.use-case.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import { BookAppointmentRequestDto } from '../dto/book-appointment-request.dto.js';
import { RescheduleOrCancelAppointmentRequestDto } from '../dto/reschedule-or-cancel-appointment-request.dto.js';
import { mapConsultationError } from '../mappers/consultation-exception.mapper.js';

// Matches docs/12-openapi.md's POST /appointments and PATCH /appointments/{id}
// exactly. GET /appointments (listAppointments, paginated) is deliberately
// not built this sprint -- not in IMPLEMENTATION_PLAN.md's bullet list, and
// AppointmentSummary's nested Patient/DoctorSummary require composing data
// from modules that don't exist.
@Controller('appointments')
export class AppointmentController {
  constructor(
    private readonly bookAppointmentUseCase: BookAppointmentUseCase,
    private readonly rescheduleOrCancelAppointmentUseCase: RescheduleOrCancelAppointmentUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async book(@Body() body: BookAppointmentRequestDto): Promise<ResponseEnvelope<AppointmentResponseDto>> {
    try {
      const appointment = await this.bookAppointmentUseCase.execute(
        new BookAppointmentCommand({
          patientId: body.patientId,
          doctorId: body.doctorId,
          availabilityWindowId: body.availabilityWindowId,
          consultationType: body.consultationType,
          reasonForVisit: body.reasonForVisit,
        }),
      );
      return envelope(AppointmentResponseDto.fromDomain(appointment));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }

  @Patch(':id')
  async rescheduleOrCancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RescheduleOrCancelAppointmentRequestDto,
  ): Promise<ResponseEnvelope<AppointmentResponseDto>> {
    try {
      const appointment = await this.rescheduleOrCancelAppointmentUseCase.execute(
        new RescheduleOrCancelAppointmentCommand({
          appointmentId: id,
          action: body.action,
          newAvailabilityWindowId: body.newAvailabilityWindowId,
        }),
      );
      return envelope(AppointmentResponseDto.fromDomain(appointment));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }
}
