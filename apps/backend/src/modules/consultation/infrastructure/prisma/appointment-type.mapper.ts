import { AppointmentType as PrismaAppointmentType } from '@prisma/client';

import { AppointmentType } from '../../domain/enums/appointment-type.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching AppointmentStatus's own mapper precedent. This is
// the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<AppointmentType, PrismaAppointmentType> = {
  [AppointmentType.Consultation]: PrismaAppointmentType.CONSULTATION,
  [AppointmentType.FollowUp]: PrismaAppointmentType.FOLLOW_UP,
  [AppointmentType.NewPatient]: PrismaAppointmentType.NEW_PATIENT,
  [AppointmentType.Procedure]: PrismaAppointmentType.PROCEDURE,
};

const PRISMA_TO_DOMAIN: Record<PrismaAppointmentType, AppointmentType> = {
  [PrismaAppointmentType.CONSULTATION]: AppointmentType.Consultation,
  [PrismaAppointmentType.FOLLOW_UP]: AppointmentType.FollowUp,
  [PrismaAppointmentType.NEW_PATIENT]: AppointmentType.NewPatient,
  [PrismaAppointmentType.PROCEDURE]: AppointmentType.Procedure,
};

export function toPrismaAppointmentType(type: AppointmentType | undefined): PrismaAppointmentType | undefined {
  return type === undefined ? undefined : DOMAIN_TO_PRISMA[type];
}

export function toDomainAppointmentType(type: PrismaAppointmentType | null): AppointmentType | undefined {
  return type === null ? undefined : PRISMA_TO_DOMAIN[type];
}
