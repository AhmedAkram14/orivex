import { AppointmentStatus as PrismaAppointmentStatus } from '@prisma/client';

import { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's AppointmentSummary.status
// exactly. This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<AppointmentStatus, PrismaAppointmentStatus> = {
  [AppointmentStatus.Requested]: PrismaAppointmentStatus.REQUESTED,
  [AppointmentStatus.Confirmed]: PrismaAppointmentStatus.CONFIRMED,
  [AppointmentStatus.Rescheduled]: PrismaAppointmentStatus.RESCHEDULED,
  [AppointmentStatus.Cancelled]: PrismaAppointmentStatus.CANCELLED,
  [AppointmentStatus.NoShow]: PrismaAppointmentStatus.NO_SHOW,
  [AppointmentStatus.Completed]: PrismaAppointmentStatus.COMPLETED,
};

const PRISMA_TO_DOMAIN: Record<PrismaAppointmentStatus, AppointmentStatus> = {
  [PrismaAppointmentStatus.REQUESTED]: AppointmentStatus.Requested,
  [PrismaAppointmentStatus.CONFIRMED]: AppointmentStatus.Confirmed,
  [PrismaAppointmentStatus.RESCHEDULED]: AppointmentStatus.Rescheduled,
  [PrismaAppointmentStatus.CANCELLED]: AppointmentStatus.Cancelled,
  [PrismaAppointmentStatus.NO_SHOW]: AppointmentStatus.NoShow,
  [PrismaAppointmentStatus.COMPLETED]: AppointmentStatus.Completed,
};

export function toPrismaAppointmentStatus(status: AppointmentStatus): PrismaAppointmentStatus {
  return DOMAIN_TO_PRISMA[status];
}

export function toDomainAppointmentStatus(status: PrismaAppointmentStatus): AppointmentStatus {
  return PRISMA_TO_DOMAIN[status];
}
