import { ConsultationState as PrismaConsultationState } from '@prisma/client';

import { ConsultationState } from '../../domain/enums/consultation-state.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's ConsultationSummary.state
// exactly. This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<ConsultationState, PrismaConsultationState> = {
  [ConsultationState.WaitingRoom]: PrismaConsultationState.WAITING_ROOM,
  [ConsultationState.InProgress]: PrismaConsultationState.IN_PROGRESS,
  [ConsultationState.Completed]: PrismaConsultationState.COMPLETED,
  [ConsultationState.Interrupted]: PrismaConsultationState.INTERRUPTED,
  [ConsultationState.Closed]: PrismaConsultationState.CLOSED,
  [ConsultationState.EmergencyEscalation]: PrismaConsultationState.EMERGENCY_ESCALATION,
};

const PRISMA_TO_DOMAIN: Record<PrismaConsultationState, ConsultationState> = {
  [PrismaConsultationState.WAITING_ROOM]: ConsultationState.WaitingRoom,
  [PrismaConsultationState.IN_PROGRESS]: ConsultationState.InProgress,
  [PrismaConsultationState.COMPLETED]: ConsultationState.Completed,
  [PrismaConsultationState.INTERRUPTED]: ConsultationState.Interrupted,
  [PrismaConsultationState.CLOSED]: ConsultationState.Closed,
  [PrismaConsultationState.EMERGENCY_ESCALATION]: ConsultationState.EmergencyEscalation,
};

export function toPrismaConsultationState(state: ConsultationState): PrismaConsultationState {
  return DOMAIN_TO_PRISMA[state];
}

export function toDomainConsultationState(state: PrismaConsultationState): ConsultationState {
  return PRISMA_TO_DOMAIN[state];
}
