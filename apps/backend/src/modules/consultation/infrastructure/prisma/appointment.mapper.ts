import type { Appointment as PrismaAppointmentRow } from '@prisma/client';

import { Appointment } from '../../domain/entities/appointment.entity.js';

import { toDomainAppointmentStatus } from './appointment-status.mapper.js';
import { toDomainConsultationType } from './consultation-type.mapper.js';

export function toDomainAppointment(row: PrismaAppointmentRow): Appointment {
  return Appointment.reconstitute({
    id: row.id,
    patientId: row.patientId,
    doctorId: row.doctorId,
    availabilityWindowId: row.availabilityWindowId,
    consultationType: toDomainConsultationType(row.consultationType),
    status: toDomainAppointmentStatus(row.status),
    scheduledAt: row.scheduledAt,
    reasonForVisit: row.reasonForVisit ?? undefined,
    rescheduledFromId: row.rescheduledFromId ?? undefined,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
