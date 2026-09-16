import type { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';

/**
 * Messages Page Overhaul, Phase 1 (added ahead of Phase 5's actual UI
 * consumption, since GetAppointmentsForDoctorAndPatientUseCase already
 * exists): the small appointment summary GET /message-threads/:id/appointments
 * returns for a thread's header context -- deliberately narrow (id,
 * scheduledAt, status only), never the full Appointment shape.
 */
export class ThreadAppointmentResponseDto {
  id!: string;
  scheduledAt!: string;
  status!: string;

  static fromDomain(appointment: Appointment): ThreadAppointmentResponseDto {
    const dto = new ThreadAppointmentResponseDto();
    dto.id = appointment.getId();
    dto.scheduledAt = appointment.getScheduledAt().toISOString();
    dto.status = appointment.getStatus();
    return dto;
  }
}
