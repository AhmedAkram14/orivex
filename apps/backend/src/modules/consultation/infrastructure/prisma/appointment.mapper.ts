import type { Appointment as PrismaAppointmentRow } from '@prisma/client';

import { Appointment } from '../../domain/entities/appointment.entity.js';

import { toDomainAppointmentStatus } from './appointment-status.mapper.js';
import { toDomainAppointmentType } from './appointment-type.mapper.js';
import { toDomainConsultationPricing } from './consultation-pricing.mapper.js';

export function toDomainAppointment(row: PrismaAppointmentRow): Appointment {
  return Appointment.reconstitute({
    id: row.id,
    patientId: row.patientId,
    doctorId: row.doctorId,
    availabilityWindowId: row.availabilityWindowId,
    pricing: toDomainConsultationPricing(row),
    status: toDomainAppointmentStatus(row.status),
    scheduledAt: row.scheduledAt,
    endTime: row.endTime ?? undefined,
    reasonForVisit: row.reasonForVisit ?? undefined,
    appointmentType: toDomainAppointmentType(row.appointmentType),
    rescheduledFromId: row.rescheduledFromId ?? undefined,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
