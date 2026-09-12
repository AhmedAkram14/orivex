import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import type {
  FreeTierBookingCaps,
  FreeTierBookingOutcome,
  FreeTierBookingRepository,
} from '../../domain/repositories/free-tier-booking.repository.js';

import { toPersistedConsultationPricing } from './consultation-pricing.mapper.js';
import { toPrismaAppointmentStatus } from './appointment-status.mapper.js';
import { toPrismaAppointmentType } from './appointment-type.mapper.js';

@Injectable()
export class PrismaFreeTierBookingRepository implements FreeTierBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async checkCapsAndSave(
    appointment: Appointment,
    patientId: string,
    caps: FreeTierBookingCaps,
  ): Promise<FreeTierBookingOutcome> {
    return this.prisma.$transaction(async (tx) => {
      // Transaction-scoped Postgres advisory lock keyed by patientId
      // (hashtext() maps the uuid string to a stable int4, widened to
      // bigint for the lock function). Auto-released at commit/rollback --
      // no manual unlock needed. Serializes concurrent free-booking
      // attempts for the SAME patient only; unrelated patients/doctors are
      // never blocked by this lock.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${patientId})::bigint)`;

      const noShowCount = await tx.appointment.count({
        where: { patientId, status: 'NO_SHOW' },
      });
      if (noShowCount >= caps.maxNoShowsBeforeBlocked) {
        return 'no_show_blocked';
      }

      const freeThisMonth = await tx.appointment.count({
        where: {
          patientId,
          consultationType: 'FREE',
          status: { not: 'CANCELLED' },
          createdAt: { gte: caps.freeConsultationsWindowStart },
        },
      });
      if (freeThisMonth >= caps.maxFreeConsultationsPerMonth) {
        return 'monthly_cap_exceeded';
      }

      await tx.appointment.create({
        data: {
          id: appointment.getId(),
          patientId: appointment.getPatientId(),
          doctorId: appointment.getDoctorId(),
          availabilityWindowId: appointment.getAvailabilityWindowId(),
          ...toPersistedConsultationPricing(appointment.getPricing()),
          status: toPrismaAppointmentStatus(appointment.getStatus()),
          scheduledAt: appointment.getScheduledAt(),
          endTime: appointment.getEndTime() ?? null,
          reasonForVisit: appointment.getReasonForVisit() ?? null,
          appointmentType: toPrismaAppointmentType(appointment.getAppointmentType()) ?? null,
          rescheduledFromId: appointment.getRescheduledFromId() ?? null,
          version: appointment.getVersion(),
        },
      });

      return 'booked';
    });
  }
}
