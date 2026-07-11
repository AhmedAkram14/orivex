import { JourneyStage as PrismaJourneyStage } from '@prisma/client';

import { JourneyStage } from '../../domain/enums/journey-stage.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's HealthJourney.stage exactly.
// This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<JourneyStage, PrismaJourneyStage> = {
  [JourneyStage.Diagnosis]: PrismaJourneyStage.DIAGNOSIS,
  [JourneyStage.FollowUp]: PrismaJourneyStage.FOLLOW_UP,
  [JourneyStage.Monitoring]: PrismaJourneyStage.MONITORING,
  [JourneyStage.Resolved]: PrismaJourneyStage.RESOLVED,
  [JourneyStage.OngoingChronic]: PrismaJourneyStage.ONGOING_CHRONIC,
  [JourneyStage.ReferredOut]: PrismaJourneyStage.REFERRED_OUT,
};

const PRISMA_TO_DOMAIN: Record<PrismaJourneyStage, JourneyStage> = {
  [PrismaJourneyStage.DIAGNOSIS]: JourneyStage.Diagnosis,
  [PrismaJourneyStage.FOLLOW_UP]: JourneyStage.FollowUp,
  [PrismaJourneyStage.MONITORING]: JourneyStage.Monitoring,
  [PrismaJourneyStage.RESOLVED]: JourneyStage.Resolved,
  [PrismaJourneyStage.ONGOING_CHRONIC]: JourneyStage.OngoingChronic,
  [PrismaJourneyStage.REFERRED_OUT]: JourneyStage.ReferredOut,
};

export function toPrismaJourneyStage(value: JourneyStage): PrismaJourneyStage {
  return DOMAIN_TO_PRISMA[value];
}

export function toDomainJourneyStage(value: PrismaJourneyStage): JourneyStage {
  return PRISMA_TO_DOMAIN[value];
}
