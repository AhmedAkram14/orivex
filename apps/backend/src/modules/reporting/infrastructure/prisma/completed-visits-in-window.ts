import { AppointmentStatus as PrismaAppointmentStatus, type Prisma } from '@prisma/client';

import type { DateWindow } from '../../application/dto/previous-period.js';

/**
 * The one definition of "active" for both sides of the platform: a doctor or
 * a patient is active in a window when they took part in at least one
 * COMPLETED appointment scheduled inside it. A booking that was cancelled,
 * declined, missed or is still upcoming says nothing about activity, so it
 * never counts (the earlier "any appointment, any status" rule overstated
 * active patients). Shared by countActivePatients and countActiveDoctors so
 * the two figures can never drift apart.
 */
export function completedVisitsIn(window: DateWindow): Prisma.AppointmentWhereInput {
  return {
    status: PrismaAppointmentStatus.COMPLETED,
    scheduledAt: { gte: window.from, lte: window.to },
  };
}
